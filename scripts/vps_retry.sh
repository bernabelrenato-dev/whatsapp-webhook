echo "require 'sidekiq/api'; Sidekiq::DeadSet.new.each(&:retry)" | sudo docker exec -i chatwoot-worker bundle exec rails runner -
