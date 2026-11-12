ActiveRecord::Schema[8.1].define(version: 2026_11_01_000000) do
  create_table "appointments", force: :cascade do |t|
    t.integer "patient_id", null: false
    t.integer "slot_id", null: false
    t.timestamps
  end

  create_table "audit_entries", force: :cascade do |t|
    t.string "action", null: false
    t.string "subject_type", null: false
    t.integer "subject_id", null: false
    t.datetime "recorded_at", null: false
  end
end
