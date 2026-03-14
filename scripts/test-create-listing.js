const listingService = require('../services/listingService');

async function run() {
  try {
    const listing = await listingService.getListing(
      '22222222-2222-2222-2222-222222222222'
    );

    console.log('Encontrado:', listing ? 'SIM' : 'NAO');
  } catch (err) {
    console.error(err.message);
  }

  process.exit(0);
}

run();