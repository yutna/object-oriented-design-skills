Rails.application.routes.draw do
  resources :appointments, only: :create
end
