var app = angular.module('FileApp', ['ngFileReader']);

app.controller('fileCtrl', function($scope){

	$scope.readMethod = "readAsDataURL";
	$scope.onSelected = function(files){
	};

	$scope.onReaded = function( e, file ){
  		$scope.img = e.target.result;

  		var canvas = document.getElementById('myCanvas');
  		var context = canvas.getContext('2d');
  		var img = new Image();
  		context.clearRect(0, 0, canvas.width, canvas.height);
  		img.src = e.target.result;
  		context.drawImage(img, 0, 0);

  		var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  		var data = imageData.data;
  		var msg = "SEGURANCA E MESMO DO CARALHO, FODA-SE";
  		encodeImage(data, msg);
  		var decodedMsg = decodeImage(data);
  		console.log("DECODED MESSAGE: " + decodedMsg);

      	// overwrite original image
      	context.putImageData(imageData, 0, 0);


	};

	var encodeImage = function(imageData, msg){
  		var letterIndex;
  		var byteIndex = 0;
  		var counter = 0;

  		for(letterIndex = 0; letterIndex < msg.length; letterIndex++){
  			for(var bitIterator = 0; bitIterator < 8; bitIterator++, counter++){
  				byteIndex = counter * 5 - 3 * Math.floor(counter / 3);
  				var bit = ( (msg.charCodeAt(letterIndex) & (1 << bitIterator)) >> bitIterator );

  				if(bit == 1){
  					imageData[byteIndex] |= 1;
  				}else{
  					imageData[byteIndex] &= ~1;
  				}
  			}
  		}

  		counter++;
  		imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 3; //end of text character
  		counter++;
  		imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 3; //end of text character
	};

	var decodeImage = function(imageData){
		var counter = 0;
		var byteIndex = 0;
		var msg = "";
		var foundFirstStop = false;

		while(1){
			var letterASCII = 0;
			for(var bitIterator = 0; bitIterator < 8; bitIterator++, counter++){
  				byteIndex = counter * 5 - 3 * Math.floor(counter / 3);
  				if(imageData[byteIndex] === 3){
  					if(foundFirstStop === true){
  						return msg;
  					}
  					else{
  						foundFirstStop = true;
  						continue;
  					}
  				}

  				var bit = imageData[byteIndex] & 1; //LSB
  				bit = bit << bitIterator;
  				letterASCII |= bit;
  			}
  			msg += String.fromCharCode(letterASCII);
		}
	};
});
