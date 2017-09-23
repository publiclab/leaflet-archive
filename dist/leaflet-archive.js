// https://archive.org/help/json.php
// &callback=MyJavascriptFunction

function fetchImages(sourceUrl) {

  sourceUrl = sourceUrl || "https://archive.org/details/grn-harvey";

  /*
  "\/a-img_4931-pipelines-in-tx-wetlands-no-trees_36927672332_o_thumb.jpg":{
    "source":"derivative",
    "format":"JPEG Thumb",
    "original":"a-img_4931-pipelines-in-tx-wetlands-no-trees_36927672332_o.jpg",
    "mtime":"1506035134",
    "size":"2414",
    "md5":"f331be01ceb54f0035210897bbbb57c7",
    "crc32":"a2b0d316",
    "sha1":"fe177469b6100c910bf9d1cbe815b415880591d6"
  }
  */

  $('head').append("<script src='" + sourceUrl + "?output=json&callback=onResponse'></script>")

}

function onResponse(result) {
  console.log(result);

  var limit = getUrlHashParameter('limit') || 5;

  Object.keys(result.files).forEach(function(key, index) {
    var identifier = result.metadata.identifier[0];
    var dir = result.dir;
    var file = result.files[key];

    function addImageMarker(img, lat, lon) {
      console.log(img, lat, lon);
      //var originalUrl = 'https://archive.org/download/' + identifier + '/' + file.original;
      new L.marker([lat, lon]).addTo(map).bindPopup("<a href='" + img.src + "'><img width='200px' src='" + img.src + "' /></a>");
    }

    if (index < (limit * 2) && file.source != "derivative") {
      $('.images').append('<img class="img-' + index + '" />');
      var img = $('.images .img-' + index)
      img.on('load', function() {
        geocodeImage(img[0], addImageMarker);
      });
      //img[0].src = 'https://archive.org/download/' + identifier + key;
      // proxy to bypass Archive.org CORS restriction -- temporary solution
      img[0].src = 'https://insecure-archive.robocracy.org/download/' + identifier + key;
    }
  });
}

/*
 * Accepts an image element, and executes given onComplete function with 
 * params as: function(img, lat, lng, angle, altitude)
 * Adapting from: 
 * https://github.com/publiclab/mapknitter/blob/6e88c7725d3c013f402526289e806b8be4fcc23c/public/cartagen/cartagen.js#L9378
 * and then this:
 * https://github.com/publiclab/mapknitter/blob/fa810dcc1ce963615a8bdb419002ed911a61cd15/app/assets/javascripts/mapknitter/Map.js#L282
 */
function geocodeImage(img, onComplete) {
  EXIF.getData(img, function() {
    var GPS = EXIF.getAllTags(img)

    console.log(GPS);
    /* If the lat/lng is available. */
    if (typeof GPS["GPSLatitude"] !== 'undefined' && typeof GPS["GPSLongitude"] !== 'undefined'){

      // sadly, encoded in [degrees,minutes,seconds] 
      var lat = (GPS["GPSLatitude"][0]) + 
                (GPS["GPSLatitude"][1]/60) + 
                (GPS["GPSLatitude"][2]/3600);
      var lng = (GPS["GPSLongitude"][0]) + 
                (GPS["GPSLongitude"][1]/60) + 
                (GPS["GPSLongitude"][2]/3600);

      if (GPS["GPSLatitudeRef"] != "N")  lat = lat*-1
      if (GPS["GPSLongitudeRef"] == "W") lng = lng*-1
    }

    // Attempt to use GPS compass heading; will require 
    // some trig to calc corner points, which you can find below:

    var angle = 0; 
    // "T" refers to "True north", so -90.
    if (GPS["GPSImgDirectionRef"] == "T")
      angle = (Math.PI / 180) * (GPS.GPSImgDirection["numerator"]/GPS.GPSImgDirection["denominator"] - 90);
    // "M" refers to "Magnetic north"
    else if (GPS["GPSImgDirectionRef"] == "M")
      angle = (Math.PI / 180) * (GPS.GPSImgDirection["numerator"]/GPS.GPSImgDirection["denominator"] - 90);
    else
      console.log("No compass data found");

    console.log("Orientation:",GPS["Orientation"]) 

    /* If there is orientation data -- i.e. landscape/portrait etc */
    if (GPS["Orientation"] == 6) { //CCW
      angle += (Math.PI / 180) * -90
    } else if (GPS["Orientation"] == 8) { //CW
      angle += (Math.PI / 180) * 90
    } else if (GPS["Orientation"] == 3) { //180
      angle += (Math.PI / 180) * 180
    }

    /* If there is altitude data */
    if (typeof GPS["GPSAltitude"] !== 'undefined' && typeof GPS["GPSAltitudeRef"] !== 'undefined'){
      // Attempt to use GPS altitude:
      // (may eventually need to find EXIF field of view for correction)
      if (typeof GPS.GPSAltitude !== 'undefined' && 
          typeof GPS.GPSAltitudeRef !== 'undefined') {
        altitude = (GPS.GPSAltitude["numerator"]/GPS.GPSAltitude["denominator"]+GPS.GPSAltitudeRef);
      } else {
        altitude = 0; // none
      }
    } 

    /* only execute callback if lat (and by 
     * implication lng) exists */
    if (lat) onComplete(img, lat, lng, angle, altitude);
  }); 
}
