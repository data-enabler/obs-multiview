<script lang="ts">
  import { login, type Obs } from './obs';

  interface Props {
    address: string;
    password: string;
    obs: Obs | null;
    error: string | null;
  }

  let {
    address = $bindable(),
    password = $bindable(),
    obs = $bindable(),
    error = $bindable(),
  }: Props = $props();
  let showPassword = $state(false);

  async function attemptLogin(e: Event) {
    e.preventDefault();
    await login(address, password)
      .then(result => [obs, error] = result);
  }

  function forget() {
    localStorage.removeItem('multiview-address');
    localStorage.removeItem('multiview-password');
    address = '';
    password = '';
  }
</script>

<main class="login-container">
  <form class="login" onsubmit={attemptLogin}>
    {#if error}
      <div class="login__error" role="alert">{error}</div>
    {/if}
    <label class="login__row login__field">
      {'Address: '}
      <input
        type="text"
        name="address"
        bind:value={address}
      />
    </label>
    <div class="login__row">
      <label class="login__field">
        {'Password: '}
        <input
          type={showPassword ? 'text' : 'password'}
          name="password"
          bind:value={password}
        />
      </label>
      <label class="login__password-toggle">
        {'Show: '}
        <input
          type="checkbox"
          bind:checked={showPassword}
        />
      </label>
    </div>
    <div class="login__actions">
      <button type="button" onclick={forget}>Forget</button>
      <button type="submit">Connect</button>
    </div>
  </form>
</main>

<style>
  .login-container {
    display: flex;
    flex-flow: column nowrap;
    height: 100vh;
  }

  .login {
    max-width: min(100%, 21em);
    box-sizing: border-box;
    margin-block: auto;
    display: flex;
    flex-flow: column nowrap;
    align-self: center;
    gap: 0.25em;
    padding: 1em;

    background-color: hsl(226, 13%, 18%);
  }

  .login__error {
    text-align: center;
    overflow-wrap: break-word;
    color: #f33;
  }

  .login__row {
    display: flex;
    flex-flow: row wrap;
    align-items: baseline;
    gap: 0 1ch;
  }

  .login__row .login__field {
    display: contents;
  }

  .login__field input {
    flex: 1 1 0;
    margin-inline-start: auto;
    max-width: 13.75rem;
    min-width: 0;
    box-sizing: border-box;
  }

  .login__password-toggle input {
    vertical-align: middle;
    transform: scale(1.6);
  }

  .login__actions {
    display: flex;
    flex-flow: row wrap;
    gap: 1ch;
  }

  .login__actions > * {
    flex: 1 0 0;
  }
</style>
