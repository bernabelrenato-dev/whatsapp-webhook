user = User.find_by(email: 'miguel.03.1997.bi@gmail.com')
if user
  puts "USER_FOUND: id=#{user.id}, email=#{user.email}, confirmed=#{user.confirmed?}, confirmed_at=#{user.confirmed_at}"
  user.password = 'Jgis2026!'
  user.password_confirmation = 'Jgis2026!'
  user.confirm unless user.confirmed?
  if user.save(validate: false)
    puts "PASSWORD_UPDATED_SUCCESSFULLY to: Jgis2026!"
  else
    puts "ERROR_SAVING: #{user.errors.full_messages.join(', ')}"
  end
else
  puts "USER_NOT_FOUND"
end
