var fs = require('fs'),
    basename = require('path').basename;

exports.build = function(data, boundary, callback){

  if (typeof data != 'object')
    return callback(new Error("Multipart expects data as key/val object."));

  var body = '',
      object = flatten(data),
      count = Object.keys(object).length;

  if (count == 0)
    return callback(new Error('Empty multipart body. Invalid data.'))

  var done = function(err, section){
    if (err) return callback(err);
    if (section) body += section;
    --count || callback(null, body + '--' + boundary + '--');
  };

  for (var key in object){

    var value = object[key];
    if (value === null || typeof value == 'undefined') {
      done();
    } else {
      var part = (value.buffer || value.file || value.content_type) ? value : {value: value};
      generate_part(key, part, boundary, done);
    }
  }

}

var generate_part = function(name, part, boundary, callback){

  var return_part = '--' + boundary + "\r\n";
  return_part += "Content-Disposition: form-data; name=\"" + name + "\"";

  var append = function(data, filename){

    if (data){
      var binary = part.content_type.indexOf('text') == -1;
      return_part += "; filename=\"" + encodeURIComponent(filename) + "\"\r\n";
      if (binary) return_part += "Content-Transfer-Encoding: binary\r\n";
      return_part += "Content-Type: " + part.content_type + "\r\n\r\n";
      return_part += binary ? data.toString('binary') : data.toString('utf8');
    }

    callback(null, return_part + '\r\n');
  };

  if ((part.file || part.buffer) && part.content_type){

    var filename = part.filename ? part.filename : part.file ? basename(part.file) : name;
    if (part.buffer) return append(part.buffer, filename);

    fs.readFile(part.file, function(err, data){
      if (err) return callback(err);
      append(data, filename);
    });

  } else {

    if (typeof part.value == 'object')
      return callback(new Error("Object received for " + name + ", expected string."))

    if (part.content_type) {
      return_part += '\r\n';
      return_part += "Content-Type: " + part.content_type;
    }

    return_part += "\r\n\r\n";
    return_part += part.value;
    append();

  }

}

// flattens nested objects for multipart body
var flatten = function(object, into, prefix){
  into = into || {};

  for(var key in object){
    var prefix_key = prefix ? prefix + "[" + key + "]" : key;
    var prop = object[key];

    if (prop && typeof prop === "object" && !(prop.buffer || prop.file || prop.content_type))
      flatten(prop, into, prefix_key)
    else
      into[prefix_key] = prop;
  }

  return into;
}
