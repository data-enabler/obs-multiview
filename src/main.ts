import { mount } from 'svelte'

import './app.css'
import App from './App.svelte'
import { version } from '../package.json' with { type: 'json' };

console.log(`obs-multiview v${version}`);

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
