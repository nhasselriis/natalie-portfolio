(() => {
  const status = document.getElementById('garden-connection-status');
  if (!status) return;

  const config = window.GARDEN_SUPABASE;
  if (!config || !window.supabase) {
    status.textContent = 'Garden connection could not be loaded.';
    status.dataset.state = 'error';
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);

  async function testGardenConnection() {
    status.textContent = 'Checking the garden…';
    status.dataset.state = 'loading';

    const { data, error } = await client
      .from('garden_marks')
      .select('id, created_at')
      .limit(1);

    if (error) {
      console.error('Garden Wall connection test failed:', error);
      status.textContent = 'The shared garden is not connected yet.';
      status.dataset.state = 'error';
      return;
    }

    status.textContent = 'Shared garden connected.';
    status.dataset.state = 'success';
    console.info('Garden Wall connected to Supabase.', data);
  }

  testGardenConnection();
})();
