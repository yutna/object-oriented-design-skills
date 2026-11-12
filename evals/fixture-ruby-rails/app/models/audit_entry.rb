class AuditEntry < ApplicationRecord
  def self.record(action, subject, at: Time.current)
    create!(action: action, subject_type: subject.class.name,
            subject_id: subject.id, recorded_at: at)
  end
end
