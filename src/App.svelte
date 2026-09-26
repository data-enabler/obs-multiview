<script lang="ts">
  import Login from './Login.svelte';
  import Multiview from './Multiview.svelte';
  import { login, type Obs } from './obs';

  const MAX_AUTO_LOGIN_ATTEMPTS = 4;
  const urlParams = new URLSearchParams(window.location.search);
  const urlAddress = urlParams.get('address') ?? localStorage.getItem('multiview-address');
  const urlPassword = urlParams.get('password') ?? localStorage.getItem('multiview-password');
  const shouldAutoConnect = urlAddress != null && urlPassword != null;

  let address: string = $state(urlAddress ?? '');
  let password: string = $state(urlPassword ?? '');
  let connecting: boolean = $state(false);
  let obs: Obs | null = $state(null);
  let error: string | null = $state(null);

  $effect(() => {
    if (shouldAutoConnect) {
      connecting = true;
      (async () => {
        for (let attempts = 0; attempts < MAX_AUTO_LOGIN_ATTEMPTS; attempts++) {
          await login(urlAddress, urlPassword)
            .then(result => [obs, error] = result);
          if (obs) {
            break;
          }
          console.warn(`Auto-login attempt ${attempts + 1} failed: "${error}"${ attempts < MAX_AUTO_LOGIN_ATTEMPTS-1 ? ', retrying...' : ''}`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        connecting = false;
      })();
    }
  });
</script>

{#if obs}
  <Multiview {obs} />
{:else if !connecting}
  <Login bind:address bind:password bind:obs bind:error />
{/if}
