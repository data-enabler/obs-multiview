<script lang="ts">
  import debounce from 'lodash.debounce';
  import { getObs } from './obs';
  import { snapToGrid, withinEpsilon, type Transform } from './transform';

  interface SceneItem {
    name: string;
    transform: Transform;
    visible: boolean;
    update: (transform: Transform) => Promise<void> | undefined;
  };

  let sceneItems: Record<number, SceneItem> = $state({});
  const urlParams = new URLSearchParams(window.location.search);
  const gridnum = +(urlParams.get('grid') || 4);

  const {
    canvas,
    onTransformChanged,
    setTransform,
    onVisibilityChanged,
    onSourceRenamed,
    onSceneItemRemoved,
  } = await getObs();

  onVisibilityChanged(({ itemId, sourceName }, visible) => {
    if (sceneItems[itemId]) {
      console.log(`Source ${sourceName} ${visible ? 'visible' : 'hidden'}`);
      sceneItems[itemId].name = sourceName;
      sceneItems[itemId].visible = visible;
    }
  });

  onSourceRenamed((oldName, newName) => {
    console.log(`Source renamed from ${oldName} to ${newName}`);
    for (const item of Object.values(sceneItems)) {
      if (item.name === oldName) {
        item.name = newName;
      }
    }
  });

  onSceneItemRemoved(({ itemId, sourceName }) => {
    console.log(`Scene item ${sourceName} removed`);
    delete sceneItems[itemId];
  });

  onTransformChanged(({ sceneName, itemId, sourceName }, transform, visible) => {
    if (sceneItems[itemId]) {
      sceneItems[itemId].name = sourceName;
      sceneItems[itemId].visible = visible;
      sceneItems[itemId].transform = transform;
      sceneItems[itemId].update(transform);
    } else {
      sceneItems[itemId] = {
        name: sourceName,
        visible,
        transform,
        update: debounce(async (newTransform: Transform) => {
          const rounded = snapToGrid(canvas, { width: gridnum, height: gridnum }, newTransform);
          console.log('Original transform', newTransform);
          console.log('Rounded transform', rounded);
          if (withinEpsilon(rounded.positionX, newTransform.positionX) &&
              withinEpsilon(rounded.positionY, newTransform.positionY) &&
              withinEpsilon(rounded.width, newTransform.width) &&
              withinEpsilon(rounded.height, newTransform.height)) {
            return;
          }
          await setTransform(sceneName, itemId, rounded);
        }, 1000),
      };
    }
  });
</script>

<main>
  {#each Object.entries(sceneItems) as [_, item]}
    {#if item.visible}
      <div class="scene-item"
        style:left="{item.transform.positionX}px"
        style:top="{item.transform.positionY}px"
        style:width="{item.transform.width}px"
        style:height="{item.transform.height}px"
      >
        {#if !item.name.endsWith('nolabel')}
          <span class="name">{item.name}</span>
        {/if}
      </div>
    {/if}
  {/each}
</main>

<style>
  .scene-item {
    position: absolute;
    box-sizing: border-box;

    border: 2px solid #ccc;
  }

  .name {
    position: absolute;
    bottom: 1em;
    left: 50%;
    max-width: 100%;
    box-sizing: border-box;

    padding: 0.1em 0.5em;
    white-space: nowrap;
    overflow-x: hidden;
    text-overflow: ellipsis;

    background: rgb(0 0 0 / 50%);
    color: rgb(255 255 255 / 75%);
    font-weight: bold;
    transform: translate(-50%, 50%);
  }
</style>
