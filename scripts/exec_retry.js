const { spawn } = require('child_process');

console.log("Running Sidekiq retry command on VPS...");
const child = spawn('gcloud.cmd', [
  'compute', 'ssh', 'jgis-chatbot-server',
  '--zone=us-central1-a',
  '--command=sudo docker exec chatwoot-worker bundle exec rails runner "require \'sidekiq/api\'; Sidekiq::DeadSet.new.each(&:retry)"'
]);

child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  console.log(`Command finished with exit code ${code}`);
});
