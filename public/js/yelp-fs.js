/**
    yelp-fs.js
    Main application JavaScript functions and implementation
**/

// global map variable
var map;
var markers = [];

// load map
window.onload = function() {

    var default_latitude = 37.7733;
    var default_longitude = -122.4367;

    map = L.map('map', {
        center: [default_latitude, default_longitude],
        zoom: 12,
        scrollWheelZoom: false
    });

    L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    $('#map').hide();
};

// hide divs on document ready
$(document).ready(function() {
    $('#yelp_table_results').hide();
    $('#fs_table_results').hide();
    $('#yelp_heading').hide();
    $('#fs_heading').hide();
    $('.get_photos').hide();
    $('#vis_heading').hide();
    $('#userTips').hide();
    $('#chart-1-section').hide();
    $('#chart-2-section').hide();
    $('#chart-3-section').hide();
    $('#fsResults').hide();
    $('#fs-images-section').hide();
});

// geolocation for finding user's location (Google Maps API)
function getLocation() {
    $('#loading-indicator1').show();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        console.log("Geolocation is not supported by this browser.");
        alert('Unabled to get location due to browser location settings being disabled.');
    }
}

// show position on map based on user location entered
function showPosition(position) {
    var locCurrent = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    map.setView(new L.LatLng(position.coords.latitude, position.coords.longitude), 15, {
        animate: true
    });
    var singleMarker = new L.marker([position.coords.latitude, position.coords.longitude]).addTo(map)
        .bindPopup('<strong>Your Location!</strong><br>Gormandize Example.')
        .openPopup();

    markers.push(singleMarker);
    map.addLayer(markers[0]);

    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'latLng': locCurrent
    }, function(results, status) {
        // console.log(results);
        var locCountryNameCount = 0;
        var locCountryName = results[locCountryNameCount].formatted_address;
        $("#user_location").val(locCountryName);
        $('#loading-indicator1').hide();
    });

}

// AJAX form that submits user's location and term to Yelp and Foursquare APIs
$('#ajaxform').submit(function() {
    var terms = $("#user_term").val();
    var near = $("#user_location").val();
    $('#map').show();

    // validation of user location and search term
    if (near === '') {
        $('#error_user_location').hide();
        $('#error_user_term').show();
    } else if (terms === '') {
        $('#error_user_location').hide();
        $('#error_user_term').show();
    } else {
        $('#error_user_location').hide();
        $('#error_user_term').hide();
        // show table, swap button for loading spinner
        $('#yelp_heading').show();
        $('#vis_heading').show();
        $('#yelp_table_results').show();
        $('#fs_table_results').show();
        $('#fs_heading').show();
        $('#search_yelp').hide();
        $('#loading-indicator2').show();
    }

    $.ajax({
        url: "/api",
        data: {
            user_term: terms,
            user_location: near
        },
        success: function(response) {
            console.log(response);
            if (response.businesses.length !== 0) {
                $('#userTips').show();
                $('#fs-images-section').show();
                $('#chart-1-section').show();
                $('#chart-2-section').show();
                $('#chart-3-section').show();
                $('#fsResults').show();
                yelp_response(response);
                foursquare_response(response);
                $("html, body").animate({
                    scrollTop: $('#mapResults').offset().top - 45
                }, 2000);
            } else {
                $('#loading-indicator2').hide();
                $('#error_user_location').html("Cannot find any results, please another search term!");
                $('#error_user_location').show();
                $('#search_yelp').show();
            }
        },
        error: function(response) {
            console.log(response);
            $('#loading-indicator2').hide();
            $('#error_user_location').html("Cannot resolve location entered, please verify that the address included the city and state");
            $('#error_user_location').show();
            $('#search_yelp').show();

        }
    }).done(function(){
        // after Yelp and FS results are done, display FS photos
        getFsPhotos();
    });

    return false;

});

$("#sizing-addon2").click(function() {
    // Toggle color to blue when clicked
    $(this).toggleClass("clicked");
});

function yelp_response(response) {

    // show button again after loading is done
    $('#loading-indicator2').hide();
    $('#search_yelp').show();

    // empty yelp results before a new search is done
    $('#yelp_results').empty();
    $('#yelp_image_results').empty();
    $('#yelp_table_results table > tbody').html("");

    // check if yelp table results already exists...
    // if it does, clear out and destroy existing table
    if ($.fn.DataTable.isDataTable('#yelp_table')) {
        $('#yelp_table').DataTable().clear();
        $('#yelp_table').DataTable().destroy();
    }

    // empty markers from map before a new search is done
    for (var j = 0; j < markers.length; j++) {
        map.removeLayer(markers[j]);
    }

    console.log(response);
    for(var k = 0; k < 3; k++){
        if(response.businesses[k].location.hasOwnProperty('neighborhoods')){
        // set neighborhoods for user tips section
        $('#rest-hood' + '-' + k).html(response.businesses[k].location.neighborhoods[0]);
        }
    }

    // set restaurant names for user tips section
    $('#rest-tip1').html("1. " + response.businesses[0].name);
    $('#rest-tip2').html("2. " + response.businesses[1].name);
    $('#rest-tip3').html("3. " + response.businesses[2].name);

    // set photos for user tips section 
    $('#rest-photo-tip1').html('<img src=' + response.businesses[0].image_url + " + class='img-circle' />");
    $('#rest-photo-tip2').html('<img src=' + response.businesses[1].image_url + " + class='img-circle' />");
    $('#rest-photo-tip3').html('<img src=' + response.businesses[2].image_url + " + class='img-circle' />");


    // set snippet text for user tips section
    $('#tip1').html('"' + response.businesses[0].snippet_text + '"');
    $('#tip2').html('"' + response.businesses[1].snippet_text + '"');
    $('#tip3').html('"' + response.businesses[2].snippet_text + '"');



    // grab only top 10 business results for chart 1
    // limit if more than 10 results
    var chart1data = [];
    var chart1Count = response.businesses.length;
    if(chart1Count > 10){
        chart1Count = 10;
    }

    // set data values for chart 1
    for(var m = 0; m < chart1Count; m++){
        chart1data.push({
            "name": response.businesses[m].name,
            "numberofratings": response.businesses[m].review_count,
            "ratings": response.businesses[m].rating
        });
    }

    var venueName, venueLocation, venueURL, 
    venuePhone, venuePhotoURL, venueMiles, venueDistance;

    // display top 20 business results on map and in table
    for (var i = 0; i < response.businesses.length; i++) {
        venueName = response.businesses[i].name;
        venueURL = response.businesses[i].url;
        venueLocation = response.businesses[i].location.address;
        venuePhone = response.businesses[i].display_phone;
        if(typeof(venuePhone) != "undefined"){
            venuePhone = response.businesses[i].display_phone.replace(/[+]/g, '');
        } else{
            venuePhone = "Not Available";
        }
        venuePhotoURL = response.businesses[i].image_url;
        venueDistance = response.businesses[i].distance;
        if(typeof(venueDistance) != "undefined"){
            venueMiles = response.businesses[i].distance * 0.00062137;
            venueDistance = Math.round(venueMiles * 100) / 100 + ' miles away';
        } else{
            venueMiles = "Not available";
            venueDistance = "Not available";
        }

        // display restaurant search results (name, link-to Yelp page, phone number, and photo(s))
        $('#yelp_table_results table > tbody').append('<tr><td>' + (i + 1) + "</td><td><a href=" +
            venueURL + ">" + " " + venueName + '</a></td><td>' +
            venueLocation + '</td><td>' + venuePhone + '</td><td>' + venueDistance + '</td></tr>');

        $('#yelp_photos').append('<img src=' + venuePhotoURL + " />");

        var first_latitude = response.businesses[0].location.coordinate.latitude;
        var first_longitude = response.businesses[0].location.coordinate.longitude;

        var new_latitude = response.businesses[i].location.coordinate.latitude;
        var new_longitude = response.businesses[i].location.coordinate.longitude;

        var starMarker = L.AwesomeMarkers.icon({
            icon: 'star',
            markerColor: 'red',
            iconColor: 'white'
        });

        var yelpMarker = L.AwesomeMarkers.icon({
            icon: 'yelp',
            markerColor: 'red',
            iconColor: 'white',
            prefix: 'fa'
        });

        // set first marker with popup
        var singleMarker = new L.marker([first_latitude, first_longitude], {
                icon: starMarker,
                riseOnHover: true
            }).addTo(map)
            .bindPopup('<strong>' + response.businesses[0].name + '</strong><br>' + response.businesses[0].location.address)
            .openPopup();

        markers.push(singleMarker);
        // make rest of markers
        var nextMarker = new L.marker([new_latitude, new_longitude], {
                icon: yelpMarker,
                riseOnHover: true
            }).addTo(map)
            .bindPopup('<strong>' + response.businesses[i].name + '</strong><br>' + response.businesses[i].location.address);
        markers.push(nextMarker);
        map.addLayer(markers[i]);

    }
    console.log(chart1data);

    var chart1 = AmCharts.makeChart("chart-1", {
        "type": "serial",
        "fontFamily": "Lato",
        "theme": "none",
        "handDrawn": true,
        "handDrawScatter": 3,
        "legend": {
            "useGraphSettings": true,
            "markerSize": 12,
            "valueWidth": 0,
            "verticalGap": 0
        },
        "titles": [],
        "dataProvider": chart1data,
        "valueAxes": [{
            "minorGridAlpha": 0.08,
            "minorGridEnabled": true,
            "position": "top",
            "axisAlpha": 0
        }],
        "startDuration": 1,
        "graphs": [{
            "balloonText": "<span style='font-size:13px;'>[[title]] for [[category]]:<b>[[value]]</b></span>",
            "title": "Number of Reviews",
            "type": "column",
            "fillAlphas": 1,
            "fillColors": "#F0AD4E",
            "lineColor": "#F0AD4E",
            "valueField": "numberofratings",
        }, {
            "balloonText": "<span style='font-size:13px;'>[[title]] for [[category]]:<b>[[value]]</b></span>",
            "bullet": "round",
            "bulletBorderAlpha": 1,
            "bulletColor": "#3A6D9A",
            "useLineColorForBulletBorder": true,
            "fillAlphas": 0,
            "lineThickness": 2,
            "lineAlpha": 1,
            "lineColor": "#3A6D9A",
            "bulletSize": 20,
            "title": "Average Rating",
            "valueField": "ratings"
        }],
        "rotate": true,
        "categoryField": "name",
        "categoryAxis": {
            "gridPosition": "start"
        }
    });
    // reload map with first restaurant's coordinates
    map.setView(new L.LatLng(first_latitude, first_longitude), 15, {
        animate: true
    });

    // initialise yelp table results
    $('#yelp_table').dataTable({
        "lengthMenu": [5, 10, 20],
        "bLengthChange": false,
        "columnDefs": [{ "targets": 3, "orderable": false }]
    });

}

function foursquare_response(response) {
    var fs_photos = [];
    var checkinsCount = [];
    var d;
    var venue_id = [];
    var venue_names = [];

    // empty results first
    $('#yelp_results').empty();
    $('#fs_table_results table > tbody').html("");

    // check if fs table results already exist
    if ($.fn.DataTable.isDataTable('#fs_table')) {
        // clear out and destroy existing table
        $('#fs_table').DataTable().clear();
        $('#fs_table').DataTable().destroy();
    }

    // empty markers from map before a new search is done
    for (var j = 0; j < markers.length; j++) {
        map.removeLayer(markers[j]);
    }

    var chart2data = [];
    var chart3data = [];

    var chart2Count = response.fs.groups[0].items.length;

    if(chart2Count > 10){
        chart2Count = 10;
    }

    var priceTier;
    // grab only top 10 results for chart 2 and 3
    for(var m = 0; m < chart2Count; m++){
        priceTier = response.fs.groups[0].items[m].venue.price;
        if(typeof(priceTier) != "undefined"){
            chart2data.push({
            "y": response.fs.groups[0].items[m].venue.price.tier,
            "x": response.fs.groups[0].items[m].venue.rating,
            "value": response.fs.groups[0].items[m].venue.name
            });
        } else{
            chart2data.push({
            "y": "Unavailable"
            });
        }

        chart3data.push({
            "venueName": response.fs.groups[0].items[m].venue.name,
            "checkins": response.fs.groups[0].items[m].venue.stats.checkinsCount
        });
    }

    console.log(chart2data);
    console.log(chart3data);

    var venueName, venueURL, venueLocation, venuePhone,
        venueMenuURL, displayMenu, venueMenuString;

    // display top 20 business results
    for (var i = 0; i < response.fs.groups[0].items.length; i++) {

        var first_latitude = response.fs.groups[0].items[0].venue.location.lat;
        var first_longitude = response.fs.groups[0].items[0].venue.location.lng;

        var new_latitude = response.fs.groups[0].items[i].venue.location.lat;
        var new_longitude = response.fs.groups[0].items[i].venue.location.lng;

        var starMarker = L.AwesomeMarkers.icon({
            icon: 'star',
            markerColor: 'blue',
            iconColor: 'white'
        });

        var fsMarker = L.AwesomeMarkers.icon({
            icon: 'foursquare',
            markerColor: 'blue',
            iconColor: 'white',
            prefix: 'fa'
        });

        // set first marker with popup
        var singleMarker = new L.marker([first_latitude, first_longitude], {
                icon: starMarker,
                riseOnHover: true
            }).addTo(map)
            .bindPopup('<strong>' + response.fs.groups[0].items[0].venue.name + '</strong><br>' + response.fs.groups[0].items[0].venue.location.address)
            .openPopup();

        markers.push(singleMarker);

        // make rest of markers
        var nextMarker = new L.marker([new_latitude, new_longitude], {
                icon: fsMarker,
                riseOnHover: true
            }).addTo(map)
            .bindPopup('<strong>' + response.fs.groups[0].items[i].venue.name + '</strong><br>' + response.fs.groups[0].items[i].venue.location.address);
        markers.push(nextMarker);
        map.addLayer(markers[i]);

        venueName = response.fs.groups[0].items[i].venue.name;

        venueLocation = response.fs.groups[0].items[i].venue.location.address;
        venuePhone = response.fs.groups[0].items[i].venue.contact.formattedPhone;

        if (venuePhone === undefined) {
            venuePhone = "Not Available";
        }
        if (response.fs.groups[0].items[i].venue.hasMenu) {
            venueMenuURL = response.fs.groups[0].items[i].venue.menu.url;
            venueMenuString = "<a href=" +
                venueMenuURL + " target='_blank' >" + "View Menu" + '</a></tr>';
        } else {
            venueMenuString = "No Menu Available" + '</tr>';
        }


        checkinsCount[i] = response.fs.groups[0].items[i].venue.stats.checkinsCount + " ";
        venue_id[i] = response.fs.groups[0].items[i].venue.id;
        venue_names[i] = venueName;

        // display restaurant search results
        venueURL = "https://foursquare.com/v/" + name.replace(/\s+/g, '-').toLowerCase() + venue_id[i];

        $('#fs_table_results table > tbody').append('<tr><td>' + (i + 1) + "</td><td><a href=" +
            venueURL + ">" + venueName + '</a></td><td>' + venueLocation + '</td><td>' + venuePhone + '</td><td>' + venueMenuString + '</td></tr>');

    }

    var chart3 = AmCharts.makeChart("chart-3", {
        "type": "pie",
        "fontFamily": "Lato",
        "pathToImages": "http://cdn.amcharts.com/lib/3/images/",
        "balloonText": "[[title]]<br><span style='font-size:14px'><b>[[value]]</b> ([[percents]]%)</span>",
        "labelRadius": 27,
        "pullOutRadius": "9%",
        "startRadius": "300%",
        "alpha": 0.65,
        "baseColor": "",
        "brightnessStep": 56.1,
        "hoverAlpha": 0.47,
        "outlineColor": "",
        "outlineThickness": 17,
        "titleField": "venueName",
        "valueField": "checkins",
        "borderColor": "",
        "color": "#888888",
        "fontSize": 12,
        "theme": "default",
        "allLabels": [],
        "balloon": {},
        "legend": {
            "markerType": "circle",
            "position": "right",
            "marginRight": 80,
            "autoMargins": false
        },
        "titles": [],
        "dataProvider": chart3data
    });

    var chart2 = AmCharts.makeChart("chart-2", {
        "type": "xy",
        "fontFamily": "Lato",
        "pathToImages": "http://www.amcharts.com/lib/3/images/",
        "plotAreaBorderAlpha": 0.35,
        "plotAreaBorderColor": "#F0AD4E", 
        "plotAreaFillAlphas": 0.50,
        "plotAreaFillColors": "#F0AD4E",  
        "startDuration": 1.5,
        "borderColor": "#FFFFFF",
        "color": "#333",
        "fontSize": 13,
        "hideBalloonTime": 154,
        "trendLines": [],
        "theme": "light",
        "titles": [],
        "dataProvider": chart2data,
        "valueAxes": [{
            "position": "bottom",
            "axisAlpha": 0,
            "title": "Restaurant Average Rating"
        }, {
            "minMaxMultiplier": 1.2,
            "axisAlpha": 0,
            "position": "left",
            "title": "Restaurant Price Tier"
        }],
        "graphs": [{
            "balloonText": "Average Rating: <b>[[x]]</b><br> Price Tier: <b>[[y]]</b><br>Restaurant: <b>[[value]]</b>",
            "bullet": "circle",
            "bulletBorderAlpha": 0.2,
            "bulletAlpha": 0.8,
            "bulletSize": 30,
            "lineAlpha": 0,
            "lineColor": "#3a6d9a",
            "fillAlphas": 0,
            "valueField": "value",
            "xField": "x",
            "yField": "y",
            "maxBulletSize": 100
        }],
        "marginLeft": 46,
        "marginBottom": 35
    });

    // reload map with first restaurant's coordinates
    map.setView([first_latitude, first_longitude], 15, {
        animate: true
    });

    // initialise fs table results
    $('#fs_table').dataTable({
        "lengthMenu": [5, 10, 20],
        "bLengthChange": false,
        "columnDefs": [{ "targets": 3, "orderable": false }]
    });

    $("#fs_images").data("venueIDs", venue_id);
    $("#fs_images").data("venueCount", response.fs.groups[0].items.length);
    $("#fs_images").data("venueNames", venue_names);


} // end entire function

// get next venue's id
function incrementVenue(){
    venueCounter++;
    getFsPhotos();
}

// get previous venue's id
function decrementVenue(){
    venueCounter--;
    getFsPhotos();
}

var venueCounter = 0;

function getFsPhotos(){
    $('#fs_images').html("");
    $('#display_fs_images').empty();
    var venue_ids = [];
    var venueCount = $("#fs_images").data("venueCount");

    // get images for whichever venue count is being shown (based on user's left-right chevron buttons)
    if(venueCounter >= venueCount){
        venueCounter = 0;
    } else if(venueCounter < 0){
        venueCounter = venueCount - 1;
    }

    var venueNumber = venueCounter;
    var venueID = $("#fs_images").data("venueIDs")[venueNumber];
    var venueName = $("#fs_images").data("venueNames")[venueNumber];
    console.log(venueID);

    $.ajax({
        url: "/api-photos",
        data: {
            venue_id: venueID
    }, success: function(response) {
            console.log(response);
            var photoCount = response.items.length;
            if(photoCount > 21){
                photoCount = 21;
            }
            console.log(venueName);
            $('#fs-images-header').html("User images for " + venueName);
            var photoURLs = [];
                for(var i = 0; i < photoCount; i++){
                    photoURLs[i] = response.items[i].prefix + '150x150' + response.items[i].suffix;
                    console.log(photoURLs[i]);

                    $('#display_fs_images').append('<div class="' + 'img' + '"><img src=' +
                        photoURLs[i] + ' /></li>');
                }
        },
        error: function(response) { 
            $('#display_fs_images').html("<h4 class='loading'>Rats! No images could be found for that venue. Perhaps it's a new venue?</h4>");
        }
    });
}

