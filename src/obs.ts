import OBSWebSocket from 'obs-websocket-js';
import type { Transform } from './transform';

export interface Obs {
  canvas: {
    width: number;
    height: number;
  };
  setTransform(sceneName: string, itemId: number, transform: Transform): Promise<void>;
  onTransformChanged(callback: (itemInfo: ItemInfo, transform: Transform, visible: boolean) => void): void;
  onVisibilityChanged(callback: (item: ItemInfo, visible: boolean) => void): void;
  onSourceRenamed(callback: (oldname: string, newName: string) => void): void;
  onSceneItemRemoved(callback: (item: ItemInfo) => void): void;
}

export interface ItemInfo {
  sceneName: string;
  itemId: number;
  sourceName: string;
}

export async function getObs(): Promise<Obs> {
  const obs = new OBSWebSocket();
  await obs.connect({ address: 'localhost:4444' });
  console.log('Connected to OBS WebSocket');

  const { sceneName, source } = await getContainingScene(obs);
  const { baseWidth, baseHeight } = await obs.send('GetVideoInfo');

  async function onVisibilityChanged(callback: (item: ItemInfo, visible: boolean) => void) {
    obs.on('SceneItemVisibilityChanged', (event) => {
      if (event['scene-name'] !== sceneName) {
        return;
      }
      callback({
        sceneName: event['scene-name'],
        itemId: event['item-id'],
        sourceName: event['item-name'],
      }, event['item-visible']);
    });
  };

  async function onSourceRenamed(callback: (oldname: string, newName: string) => void) {
    obs.on('SourceRenamed', (event) => {
      callback(event.previousName, event.newName);
    });
  }

  async function onSceneItemRemoved(callback: (item: ItemInfo) => void) {
    obs.on('SceneItemRemoved', (event) => {
      if (event['scene-name'] !== sceneName) {
        return;
      }
      callback({
        sceneName: event['scene-name'],
        itemId: event['item-id'],
        sourceName: event['item-name'],
      });
    });
  }

  async function onTransformChanged(callback: (item: ItemInfo, transform: Transform, visible: boolean) => void) {
    const data = await obs.send('GetSceneItemList', { sceneName });
    for (const item of data.sceneItems) {
      // Ignore multiview overlay source
      if (item.sourceName === source.name) {
        continue;
      }
      if (item.sourceName.endsWith('nomultiview')) {
        continue;
      }
      const props = await obs.send(
        'GetSceneItemProperties',
        {
          'scene-name': sceneName,
          item: {
            id: item.itemId,
          },
        }
      );
      const itemInfo: ItemInfo = {
        sceneName,
        itemId: item.itemId,
        sourceName: item.sourceName,
      };
      const usingBounds = props.bounds.type !== 'OBS_BOUNDS_NONE';
      const transform = {
        positionX: props.position.x,
        positionY: props.position.y,
        width: usingBounds ? props.bounds.x : props.width,
        height: usingBounds ? props.bounds.y : props.height,
        sourceWidth: props.sourceWidth,
        sourceHeight: props.sourceHeight,
        usingBounds,
        crop: props.crop,
      };
      callback(itemInfo, transform, props.visible);
    }

    obs.on('SceneItemTransformChanged', (event) => {
      if (event['scene-name'] !== sceneName) {
        return;
      }
      // Ignore multiview overlay source
      if (event['item-name'] === source.name) {
        return;
      }
      if (event['item-name'].endsWith('nomultiview')) {
        return;
      }

      const itemInfo: ItemInfo = {
        sceneName: event['scene-name'],
        itemId: event['item-id'],
        sourceName: event['item-name'],
      };
      const usingBounds = event.transform.bounds.type !== 'OBS_BOUNDS_NONE';
      const sourceWidth = event.transform.sourceWidth;
      const sourceHeight = event.transform.sourceHeight;
      const crop = event.transform.crop;
      const scaledWidth = (sourceWidth - (crop.left ?? 0) - (crop.right ?? 0)) * event.transform.scale.x;
      const scaledHeight = (sourceHeight - (crop.top ?? 0) - (crop.bottom ?? 0)) * event.transform.scale.y;
      const transform: Transform = {
        positionX: event.transform.position.x,
        positionY: event.transform.position.y,
        width: usingBounds ? event.transform.bounds.x : scaledWidth,
        height: usingBounds ? event.transform.bounds.y : scaledHeight,
        sourceWidth,
        sourceHeight,
        usingBounds,
        crop,
      }
      console.log('Transform changed', event.transform);
      callback(itemInfo, transform, event.transform.visible);
    });
  }

  async function setTransform(sceneName: string, itemId: number, transform: Transform): Promise<void> {
    const croppedSourceWidth = transform.sourceWidth - (transform.crop.left ?? 0) - (transform.crop.right ?? 0);
    const croppedSourceHeight = transform.sourceHeight - (transform.crop.top ?? 0) - (transform.crop.bottom ?? 0);
    await obs.send('SetSceneItemProperties', {
      'scene-name': sceneName,
      item: {
        id: itemId,
      },
      position: {
        x: transform.positionX,
        y: transform.positionY,
      },
      scale: transform.usingBounds ? {} : {
        x: transform.width / croppedSourceWidth,
        y: transform.height / croppedSourceHeight,
      },
      crop: {},
      bounds: !transform.usingBounds ? {} : {
        x: transform.width,
        y: transform.height,
      },
    });
  }

  return {
    canvas: {
      width: baseWidth,
      height: baseHeight,
    },
    setTransform,
    onTransformChanged,
    onVisibilityChanged,
    onSourceRenamed,
    onSceneItemRemoved,
  }
}

async function getContainingScene(obs: OBSWebSocket): Promise<{
  source: {
    name: string,
    typeId: string,
    type: string,
  },
  sceneItemId: number,
  sceneName: string,
}> {
  // I cannot believe there isn't an API to make this easier...
  const source = await getContainingSource(obs);
  const { scenes } = await obs.send('GetSceneList');
  for (const scene of scenes) {
    for (const sceneItem of scene.sources) {
      if (sceneItem.name === source.name) {
        return {
          source,
          sceneItemId: sceneItem.id,
          sceneName: scene.name,
        };
      }
    }
  }
  throw new Error('Could not scene containing browser source');
}

async function getContainingSource(obs: OBSWebSocket): Promise<{
  name: string,
  typeId: string,
  type: string,
}> {
  const pageUrl = window.location.href;
  const { sources } = await obs.send('GetSourcesList');
  for (const source of sources) {
    if (source.typeId === 'browser_source') {
      const props = await obs.send('GetSourceSettings', { sourceName: source.name });
      const settings = props.sourceSettings as Record<string, string|undefined>;
      const isLocalFile = settings['is_local_file'];
      const settingsUrl = settings['url'];
      const settingsFile = settings['local_file'];
      if (!isLocalFile && settingsUrl) {
        // OBS will accept url-encoded characters, so `  `, ` %20`, and `%20%20`
        // will all end up being presented to the browser as `%20%20`.
        // Therefore, there's no way to tell exactly what the settings URL was
        // based on the page URL.
        // OBS will also accept protocol-less URLs.
        if (decodeURI(pageUrl).endsWith(decodeURI(settingsUrl))) {
          return source;
        }
      }
      if (isLocalFile && settingsFile) {
        // OBS uses the format http://absolute/${path}, though I don't want to
        // depend on that. Also, OBS supports relative paths but the leading `.`
        // isn't included in the URL. The way the file path is encoded doesn't
        // seem to match encodeURI or encodeURIComponent, so just decode the
        // page URL instead.
        if (decodeURIComponent(pageUrl).endsWith(settingsFile.replace(/^\.+/, ''))) {
          return source;
        }
      }
    }
  }
  throw new Error('Could not find browser source');
}
