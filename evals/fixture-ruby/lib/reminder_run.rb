require_relative 'email_channel'
require_relative 'sms_channel'

class ReminderRun
  def initialize(channels)
    @channels = channels
  end

  def deliver(reminder)
    @channels.each do |channel|
      case channel
      when EmailChannel
        channel.mail(reminder.email, reminder.text)
      when SmsChannel
        channel.text(reminder.phone, reminder.text)
      end
    end
  end
end
