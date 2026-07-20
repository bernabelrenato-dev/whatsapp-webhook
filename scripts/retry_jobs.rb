require 'sidekiq/api'
Sidekiq::DeadSet.new.each(&:retry)
puts "Retried all dead Sidekiq jobs successfully!"
