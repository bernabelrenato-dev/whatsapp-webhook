user = User.find_by(email: 'miguel.03.1997.bi@gmail.com')
if user
  au = AccountUser.find_or_create_by!(account_id: 1, user_id: user.id) do |a|
    a.role = :agent
  end
  puts "AccountUser verified: account_id=#{au.account_id}, user_id=#{au.user_id}, role=#{au.role}"

  im = InboxMember.find_or_create_by!(inbox_id: 1, user_id: user.id)
  puts "InboxMember verified: inbox_id=#{im.inbox_id}, user_id=#{im.user_id}"
end
