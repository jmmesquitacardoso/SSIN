var replaceAt = function(str, index, character){
	return str.substring(0, index) + character + str.substring(index+1);
};

var app = angular.module('FileApp', ['ngFileReader']);
app.config(["$compileProvider", function($compileProvider) {

    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(blob:|data:audio)/);

}]);

app.controller('fileCtrl', ['$scope', '$sce', function($scope, $sce){
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
			$scope.sound = $sce.trustAsResourceUrl(e.target.result);
			var newSound = encodeSound(e.target.result, $scope.msg, 1);
			var msg = decodeSound(newSound, 1);
			$scope.modifiedSound = $sce.trustAsResourceUrl(newSound);
			console.log("MSG = " + msg);
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

  	var encodeSound = function(soundData, msg, nBits){
  		var soundCopy = angular.copy(soundData);
  		var binaryIndex = soundData.indexOf("base64,");
  		var binarySound = soundData.substring(binaryIndex + 7);
  		var decoded = decode64(binarySound);
  		var decimalArray = [];
  		var andValue = 2 * Math.pow(2, nBits - 1) - 1;
  		console.log("andValue= " + andValue);

  		for(var i = 0; i < decoded.length; i++){
  			decimalArray[i] = decoded[i].charCodeAt(0);
  		}
  		
  		var sampleBits = (decimalArray[35] << 8) | decimalArray[34];
  		var dataBlockSize = (((((decimalArray[43] << 8) | decimalArray[42]) << 8) | decimalArray[41]) << 8) | decimalArray[40];
  		var nSamples = dataBlockSize / sampleBits;
  		var sampleIterator = 45;

  		console.log("---ENCODE, " + sampleBits + " bits/sample, " + nSamples + " samples");
  		console.log(decimalArray.length);
  		for(letterIndex = 0; letterIndex < msg.length; letterIndex++){
			for(var bitIterator = 0; bitIterator < 8; bitIterator += nBits){
				console.log("--- BIT " + bitIterator + " ----");
				var byteValue = ( (msg.charCodeAt(letterIndex) & (andValue << bitIterator) )) >> bitIterator;
				console.log("BYTE = " + byteValue);
				if(byteValue != 0){
					console.log("BEFORE: " + decimalArray[sampleIterator]);
					decimalArray[sampleIterator] ^= byteValue; 
					//soundCopy = replaceAt(soundCopy, sampleIterator, String.fromCharCode(soundCopy[sampleIterator].charCodeAt(0) ^ byteValue));
					for(var i = 0; i < nBits; i++){
						var bitValue = (byteValue >> i) & 1;
						var newData;
						if(bitValue == 1){
							/*newData = soundCopy[sampleIterator].charCodeAt(0) | (1 << i);
							soundCopy =  replaceAt(soundCopy, sampleIterator, String.fromCharCode(newData));*/ //Set bit i
							decimalArray[sampleIterator] |= (1 << i); 
						}
						else{
							/*newData = soundCopy[sampleIterator].charCodeAt(0) & ~(1 << i);
							soundCopy= replaceAt(soundCopy, sampleIterator, String.fromCharCode(newData) );*/ //Clear bit i
							decimalArray[sampleIterator] &= ~(1 << i);
						}
					}
					console.log("AFTER: " + decimalArray[sampleIterator]);
				}else{
					console.log("BEFORE: " + decimalArray[sampleIterator]);
					decimalArray[sampleIterator] &= (~andValue);
					//soundCopy = replaceAt(soundCopy, sampleIterator, String.fromCharCode(soundCopy[sampleIterator].charCodeAt(0) & (~andValue)));
					console.log("AFTER: " + decimalArray[sampleIterator]);
				}
			sampleIterator++;
			}
		}

		decimalArray[sampleIterator] = 3;
		sampleIterator++;
		decimalArray[sampleIterator] = 3;
		var encoded = "";
		for(var i = 0; i < decimalArray.length; i++){
			encoded += String.fromCharCode(decimalArray[i]);
		}
		encoded = encode64(encoded);
		return soundData.substring(0, binaryIndex + 7) + encoded;
  	};

  	var decodeSound = function(soundData, nBits){
  		var binaryIndex = soundData.indexOf("base64,");
  		var binarySound = soundData.substring(binaryIndex + 7);
  		var decoded = decode64(binarySound);
  		var decimalArray = [];
  		var andValue = 2 * Math.pow(2, nBits - 1) - 1;
  		var sampleIterator = 45;
  		var msg = "";
  		var foundFirstStop = false;

  		for(var i = 0; i < decoded.length; i++){
  			decimalArray[i] = decoded[i].charCodeAt(0);
  		}

  		var sampleBits = (decimalArray[35] << 8) | decimalArray[34];

  		console.log("-----DECODE, " + sampleBits + " bits/sample");
  		console.log(decimalArray[34]);
  		console.log(decimalArray[35]);
  		console.log(decimalArray.length);
  		while(1){
  		var letterASCII = 0;
  		for(var bitIterator = 0; bitIterator < 8; bitIterator += nBits){
  			console.log("---BIT " + bitIterator + " -----");
  			if(decimalArray[sampleIterator] === 3){
  				if(foundFirstStop === true){
  					return msg;
  				}
  				else{
  					foundFirstStop = true;
  					console.log("FOUND ONE STOP");
  					continue;
  				}
  			}
  			else{
  					console.log("SOUND DATA = " + decimalArray[sampleIterator]);
  					var byteValue = decimalArray[sampleIterator] & andValue; //LSB
  					console.log("byteValue = " + byteValue);
  					byteValue = byteValue << bitIterator;
  					letterASCII |= byteValue;
  				}
  				sampleIterator ++;
  			}
  			console.log("sampleIterator = " + sampleIterator);
  			console.log(letterASCII);
  			msg += String.fromCharCode(letterASCII);
  		}
  	};
  }]);
