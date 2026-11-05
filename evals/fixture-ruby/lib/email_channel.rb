class EmailChannel
  attr_reader :sent

  def initialize
    @sent = []
  end

  def mail(address, text)
    @sent << [address, text]
  end
end
