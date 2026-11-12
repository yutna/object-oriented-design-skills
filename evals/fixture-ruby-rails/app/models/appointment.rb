class Appointment < ApplicationRecord
  validates :patient_id, :slot_id, presence: true
end
