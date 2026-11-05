class SmsChannel
  attr_reader :sent

  def initialize
    @sent = []
  end

  def text(number, body)
    @sent << [number, body]
  end
end
