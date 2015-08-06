# Gormanize -  main.rb
# Runs the backend server for Ruby Web App (using Sinatra)
# Primarily used for returning the API tokens for Yelp and Foursquare
require 'sinatra'
require 'sinatra/reloader' if development?
require 'dotenv'
Dotenv.load

require 'yelp'
require 'json'
require 'foursquare2'

# Yelp API calls
class YelpAPI

  Yelp.client.configure do |config|
    config.consumer_key = ENV['yelp_consumer_key']
    config.consumer_secret = ENV['yelp_consumer_secret']
    config.token = ENV['yelp_token']
    config.token_secret = ENV['yelp_token_secret']
  end

  def self.search_yelp(term, location)
    params = { term: term,
           limit: 20
         }

    locale = { lang: 'en' }

    return Yelp.client.search(location, params, locale).to_json
  end

end

# Foursquare API calls
class FoursquareAPI

  @fs_client = Foursquare2::Client.new(:client_id => ENV['foursquare_client_id'], :client_secret => ENV[
    'foursquare_client_secret'], :api_version => ENV['foursquare_api_version'])

  def self.search_fs(term, location)
    return @fs_client.explore_venues(options = {near: location, query: term, limit: 20}).to_json
  end

  def self.search_fs_photos(venueID)
    return @fs_client.venue_photos(venueID).to_json
  end

end

# Routes

get '/' do
  erb :home
end

get '/about' do
  erb :about
end

get '/help' do
  erb :help
end

get '/tech' do
  erb :tech
end

get '/api' do
  content_type :json
  @term = params[:user_term]
  @location = params[:user_location]

  yelp_response = YelpAPI.search_yelp(@term, @location)
  fs_response = FoursquareAPI.search_fs(@term, @location)
  # combine foursquare response into yelp response to create one single JSON response
  rb_hash = JSON.parse(yelp_response)
  rb_hash["fs"] = JSON.parse(fs_response)

  # return combined response
  return rb_hash.to_json
end

get '/api-photos' do
  content_type :json
  @venue_id = params[:venue_id]
  # for each foursquare venue ID, get all photos
  fs_response_photos = FoursquareAPI.search_fs_photos(@venue_id)
  fs_parse = JSON.parse(fs_response_photos)
  return fs_parse.to_json
end

not_found do
  status 404
  erb :oops
end
