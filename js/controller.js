var app = angular.module('FileApp', ['ngFileReader']);

app.controller('fileCtrl', function($scope){

	$scope.readMethod = "readAsDataURL";
	$scope.onSelected = function(files){
	};

	$scope.onReaded = function( e, file ){

		if(file.type.indexOf("image") != -1){ //Image file
			$scope.img = e.target.result;
			var data;
			var canvas = document.getElementById('myCanvas');
			var context = canvas.getContext('2d');
			var img = new Image();
			context.clearRect(0, 0, canvas.width, canvas.height);
			img.src = e.target.result;
			img.onload = function(){
				context.drawImage(img, 0, 0);
				var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
				var data = imageData.data;
				encodeImage(data, $scope.msg, 1);
				console.log("\n\n\n");
				var decodedMsg = decodeImage(data, 1);
				console.log("DECODED MESSAGE: " + decodedMsg);

      			// overwrite original image
      			context.putImageData(imageData, 0, 0);
      		};
		}
		else if(file.type.indexOf("audio") != -1){ //Audio file
			
		}
      };

	/**
	*** Distribui cada bit de cada letra pelos LSB dos componentes RGB de bytes alternados
	*** E.G., SEGURANCA -> bits de S -> {bit 1 -> R do byte 1, bit 2 -> G do byte 2, ...}
	**/
	var encodeImage = function(imageData, msg, nBits){
		var letterIndex;
		var byteIndex = 0;
		var counter = 0;
		var andValue = 2 * Math.pow(2, nBits - 1) - 1;

		for(letterIndex = 0; letterIndex < msg.length; letterIndex++){
			for(var bitIterator = 0; bitIterator < 8; bitIterator += nBits){
				console.log("------ BIT " + bitIterator + " -------");
				byteIndex = counter * 5 - 3 * Math.floor(counter / 3);
				counter++;
				console.log("imageData = " + imageData[byteIndex]);
				var byteValue = ( (msg.charCodeAt(letterIndex) & (andValue << bitIterator) )) >> bitIterator;
				console.log("Byte Value = " + byteValue);
				if(byteValue != 0){
					imageData[byteIndex] = (imageData[byteIndex]) ^ byteValue;
					for(var i = 0; i < nBits; i++){
						console.log("CHANGING BIT " + i);
						var bitValue = (byteValue >> i) & 1;
						if(bitValue == 1){
							imageData[byteIndex] |= 1 << i;
						}
						else{
							imageData[byteIndex] &= ~(1 << i);
						}
					}
				}else{
					imageData[byteIndex] &= ~andValue;
				}
				console.log("ENCODED VALUE = " + imageData[byteIndex]);
			}
		}

      imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 3; //end of text character
      counter++;
      imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 3; //end of text character
  };

  var decodeImage = function(imageData, nBits){
  	var counter = 0;
  	var byteIndex = 0;
  	var msg = "";
  	var foundFirstStop = false;
  	var andValue = 2 * Math.pow(2, nBits - 1) - 1;

  	while(1){
  		var letterASCII = 0;
  		for(var bitIterator = 0; bitIterator < 8; bitIterator += nBits, counter++){
  			console.log("--- bitIterator = " + bitIterator + " ---");
  			byteIndex = counter * 5 - 3 * Math.floor(counter / 3);
  			if(imageData[byteIndex] === 3){
  				if(foundFirstStop === true){
  					console.log("ENDING");
  					return msg;
  				}
  				else{
  					foundFirstStop = true;
  					console.log("FOUND ONE");
  					continue;
  				}
  			}
  			else{
  					var byteValue = imageData[byteIndex] & andValue; //LSB
  					console.log("i = " + bitIterator + " imageData = " + imageData[byteIndex]);
  					console.log("byteValue = " + byteValue);
  					byteValue = byteValue << bitIterator;
  					console.log("AFTER SHIFT " + byteValue);
  					letterASCII |= byteValue;
  				}	
  			}
  			console.log("FINAL ASCII NUMBER " + letterASCII);
  			msg += String.fromCharCode(letterASCII);
  		}
  	};
  });
