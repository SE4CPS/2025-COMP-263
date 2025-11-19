const DataLakeIntegrator = require('./mongoDataSync');

async function runDataLakePipeline() {
  const integrator = new DataLakeIntegrator();
  
  try {
    await integrator.runIngestionPipeline();
    console.log('Pipeline completed successfully');
  } catch (error) {
    console.error('Pipeline failed:', error.message);
    process.exit(1);
  }
}

runDataLakePipeline();
