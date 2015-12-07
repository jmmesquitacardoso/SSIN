var app = angular.module('FileApp', ['ngFileReader']);
app.config(["$compileProvider", function($compileProvider) {

    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(blob:|data:audio|data:image)/);

}]);

app.controller('fileCtrl', ['$scope', '$sce', function($scope, $sce){

  $scope.selectedMode = 'image';
  $scope.imageBit = 8;
  $scope.soundNBit = 8;
  $scope.videoNBit = 8;

	$scope.readMethod = "readAsDataURL";
	$scope.onSelected = function(files){
	};

  $scope.downloadCanvas = function () {
    var canvas = document.getElementById("myCanvas");
    var dataURL = canvas.toDataURL('image/png');
    var button = document.getElementById('download');
    button.href = dataURL;
  };

	$scope.onReaded = function( e, file ){

		if(file.type.indexOf("image") != -1){ //Image file
			$scope.img = e.target.result;
			var data;
			var canvas = document.getElementById('myCanvas');
			var context = canvas.getContext('2d');
			var img = new Image();
			img.src = e.target.result;
			img.onload = function(){
      document.getElementById("myCanvas").width = img.width;
      document.getElementById("myCanvas").height = img.height;
			context.clearRect(0, 0, canvas.width, canvas.height);
				context.drawImage(img, 0, 0);
				var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
				var data = imageData.data;
				encodeImage(data, $scope.msg, $scope.imageBit);
				var decodedMsg = decodeImage(data);
				$scope.decodedMessage = decodedMsg;
				$scope.$apply();

      			// overwrite original image
      			context.putImageData(imageData, 0, 0);
      		};
		}
		else if(file.type.indexOf("audio") != -1){ //Audio file
			$scope.sound = $sce.trustAsResourceUrl(e.target.result);
			var newSound = encodeSound(e.target.result, $scope.msg, $scope.soundNBit);
			var msg = decodeSound(newSound);
			$scope.modifiedSound = $sce.trustAsResourceUrl(newSound);
		}
        else if (file.type.indexOf("video") !== -1){
            $scope.video = $sce.trustAsResourceUrl(e.target.result);
			var videoData = e.target.result;

			var encodeVideo = function(videoData, msg, nBits){
				var binaryIndex = videoData.indexOf("base64,"),
					binaryVideo = videoData.substring(binaryIndex + 7),
					decoded = decode64(binaryVideo),
					decimalArray = [],
					first = true;

				for(var i = 0; i < decoded.length; i++){
		  			decimalArray[i] = decoded[i].charCodeAt(0);
		  		}

				var textToIncode = "";
				for(var letterIndex = 0; letterIndex < msg.length; letterIndex++){
					var binString = msg[letterIndex].charCodeAt(0).toString(2);
					while(binString.length < 8){
						binString = "0" + binString;
					}
					textToIncode += binString;
				}

				textToIncode += "01011100011100100101110001101110";
				textToIncode = textToIncode.split("");

				var encodeVideoFrame = function(firstByte, lastByte){
					var i = firstByte;
					if(first){
						decimalArray[i] = nBits;
						i++;
						first = false;
					}
					for(i; i < lastByte; i++){
						if(textToIncode.length <= 0){
							return;
						}

						var bit = textToIncode.slice(0,nBits);
						for(var k = 0; k < nBits; k++){
							var bitValue = bit[bit.length - 1 - k];
							if(bitValue == 1){
								decimalArray[i] |= (1 << k);
							}
							else{
								decimalArray[i] &= ~(1 << k);
							}
						}
						textToIncode.splice(0,nBits);
					}
				}

				var arrayIndex = 0,
					done = false;

				while(arrayIndex < decimalArray.length && !done) {
					if(decimalArray[arrayIndex] == 109 &&
						decimalArray[arrayIndex + 1] == 100 &&
						decimalArray[arrayIndex + 2] == 97 &&
						decimalArray[arrayIndex + 3] == 116){

						var packetSize = decimalArray[arrayIndex - 1] +
									decimalArray[arrayIndex - 2] +
									decimalArray[arrayIndex - 3] +
									decimalArray[arrayIndex - 4];
							encodeVideoFrame(arrayIndex + 4, arrayIndex + packetSize - 4);

							if(textToIncode.length <= 0){
								done = true;
							}
							else{
								arrayIndex += packetSize;
							}
					}
					else{
						arrayIndex++;
					}
				}
				var encoded = "";
				for(var i = 0; i < decimalArray.length; i++){
					encoded += String.fromCharCode(decimalArray[i]);
				}

				encoded = encode64(encoded);
				return videoData.substring(0, binaryIndex + 7) + encoded;
			}

			var newVideo = encodeVideo(angular.copy(videoData),$scope.msg, $scope.videoNBit);
			$scope.modifiedVideo = $sce.trustAsResourceUrl(newVideo);

			var decodedVideo = function(newVideo){

				var binaryIndex = newVideo.indexOf("base64,"),
					binaryVideo = newVideo.substring(binaryIndex + 7),
					decoded = decode64(binaryVideo),
					decimalArray = [],
					first = true,
					nBits;

				for(var i = 0; i < decoded.length; i++){
					decimalArray[i] = decoded[i].charCodeAt(0);
				}

				var msg = "",
					done = false;

				var decodeVideoFrame = function(firstByte, lastByte){
					var i = firstByte;
					if(first){
						nBits = decimalArray[i];
						i++;
						first = false;
					}

					for(i; i < lastByte; i++){

						var byteValueArray = (decimalArray[i] >>> 0).toString(2);
						while(byteValueArray.length < 8){
							byteValueArray = "0" + byteValueArray;
						}

						byteValueArray = byteValueArray.split("");
						var byteValueString = byteValueArray.slice(8-nBits, 8).join("");
						msg += byteValueString;

						if(msg.indexOf("01011100011100100101110001101110") > -1){
							done = true;
							return msg;
						}
					}
					return msg;
				}

				var arrayIndex = 0;
				while(arrayIndex < decimalArray.length && !done) {
					if(decimalArray[arrayIndex] == 109 &&
						decimalArray[arrayIndex + 1] == 100 &&
						decimalArray[arrayIndex + 2] == 97 &&
						decimalArray[arrayIndex + 3] == 116){

						var packetSize = decimalArray[arrayIndex - 1] +
									decimalArray[arrayIndex - 2] +
									decimalArray[arrayIndex - 3] +
									decimalArray[arrayIndex - 4];

							decodeVideoFrame(arrayIndex + 4, arrayIndex + packetSize - 4);

						if(!done){
							arrayIndex += packetSize;
						}
						else{
							return msg;
						}
					}
					else{
						arrayIndex++;
					}
				}

				return msg;
			}

			var decodedMessage = decodedVideo(newVideo).split(""),
				decodedMessageFinal = decodedMessage.slice(0, decodedMessage.length - 32).join("");


			var res = decodedMessageFinal.match(/[01]{8}/g).map(function(v) {
			    return String.fromCharCode( parseInt(v,2) );
			}).join('');

			$scope.decodedMessage = res;
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

		// Se o tamanho da mensagem for maior que o número de bits da imagem retorna
		if (imageData.length/4 < msg.length*8/nBits) {
			alert("Mensagem demasiado grande");
			return;
		}

		for(letterIndex = 0; letterIndex < msg.length; letterIndex++){
			for(var bitIterator = 0; bitIterator < 8; bitIterator += nBits){
				byteIndex = counter * 5 - 3 * Math.floor(counter / 3);
				counter++;
				var byteValue = ( (msg.charCodeAt(letterIndex) & (andValue << bitIterator) )) >> bitIterator;
				if(byteValue != 0){
					imageData[byteIndex] = (imageData[byteIndex]) ^ byteValue;
					for(var i = 0; i < nBits; i++){
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
			}
		}

			imageData[3] = nBits;
      imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 92; //end of text character
      counter++;
      imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 114; //end of text character
      counter++;
      imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 92; //end of text character
      counter++;
      imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 110; //end of text character
  };

  var decodeImage = function(imageData){
  	var counter = 0;
  	var byteIndex = 0;
  	var msg = "";
  	var foundFirstStop = false;
		var nBits = imageData[3];
  	var andValue = 2 * Math.pow(2, nBits - 1) - 1;
    var nTimes = 0;


  	while(1){
  		var letterASCII = 0;
  		for(var bitIterator = 0; bitIterator < 8; bitIterator += nBits, counter++){
  			byteIndex = counter * 5 - 3 * Math.floor(counter / 3);
  			if(foundFirstStop === true) {
  				if(imageData[byteIndex] == 114 && imageData[(counter+1) * 5 - 3 * Math.floor((counter+1) / 3)] == 92 && imageData[(counter+2) * 5 - 3 * Math.floor((counter+2) / 3)] == 110) {
					$scope.decodedMessage = msg;
					return msg;
		        }
  			} else{
						if (imageData[byteIndex] == 92) {
							foundFirstStop = true;
							continue;
						}
  					var byteValue = imageData[byteIndex] & andValue; //LSB
  					byteValue = byteValue << bitIterator;
  					letterASCII |= byteValue;
  				}
  			}
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

  		for(var i = 0; i < decoded.length; i++){
  			decimalArray[i] = decoded[i].charCodeAt(0);
  		}

  		var sampleBits = (decimalArray[35] << 4) | decimalArray[34];
  		var dataBlockSize = (((((decimalArray[43] << 4) | decimalArray[42]) << 4) | decimalArray[41]) << 4) | decimalArray[40];

			// Se a mensagem for maior que o numero de bits do som
			if (dataBlockSize < (msg.length*8/nBits)) {
				alert("Mensagem demasiado grande");
				return;
			}

  		var nSamples = dataBlockSize / sampleBits;
  		var sampleIterator = 45;
			decimalArray[sampleIterator] = nBits;
			sampleIterator++;

  		for(letterIndex = 0; letterIndex < msg.length; letterIndex++){
			for(var bitIterator = 0; bitIterator < 8; bitIterator += nBits){
				var byteValue = ( (msg.charCodeAt(letterIndex) & (andValue << bitIterator) )) >> bitIterator;
				if(byteValue != 0){
					decimalArray[sampleIterator] ^= byteValue;
					for(var i = 0; i < nBits; i++){
						var bitValue = (byteValue >> i) & 1;
						var newData;
						if(bitValue == 1){
							decimalArray[sampleIterator] |= (1 << i);
						}
						else{
							decimalArray[sampleIterator] &= ~(1 << i);
						}
					}
				}else{
					decimalArray[sampleIterator] &= (~andValue);
				}
			  sampleIterator++;
			}
		}

		decimalArray[sampleIterator] = 92;
		sampleIterator++;
		decimalArray[sampleIterator] = 114;
    sampleIterator++;
    decimalArray[sampleIterator] = 92;
    sampleIterator++;
    decimalArray[sampleIterator] = 110;
		var encoded = "";
		for(var i = 0; i < decimalArray.length; i++){
			encoded += String.fromCharCode(decimalArray[i]);
		}
		encoded = encode64(encoded);
		return soundData.substring(0, binaryIndex + 7) + encoded;
  	};

  	var decodeSound = function(soundData){
  		var binaryIndex = soundData.indexOf("base64,");
  		var binarySound = soundData.substring(binaryIndex + 7);
  		var decoded = decode64(binarySound);
  		var decimalArray = [];
  		var sampleIterator = 45;
  		var msg = "";
  		var foundFirstStop = false;

  		for(var i = 0; i < decoded.length; i++){
  			decimalArray[i] = decoded[i].charCodeAt(0);
  		}

  		var sampleBits = (decimalArray[35] << 4) | decimalArray[34];

			var nBits = decimalArray[45];
  		var andValue = 2 * Math.pow(2, nBits - 1) - 1;
			sampleIterator++;

  		while(1) {
  		var letterASCII = 0;
  		for (var bitIterator = 0; bitIterator < 8; bitIterator += nBits) {
  			if (foundFirstStop === true) {
  				if (decimalArray[sampleIterator] == 114 && decimalArray[(sampleIterator+1)] == 92 && decimalArray[(sampleIterator+2)] == 110) {
					$scope.decodedMessage = msg;
					return msg;
  				}
  			} else {
					if (decimalArray[sampleIterator] === 92) {
	  					foundFirstStop = true;
	  					continue;
					}
  				var byteValue = decimalArray[sampleIterator] & andValue; //LSB
  				byteValue = byteValue << bitIterator;
  				letterASCII |= byteValue;
  			}
  			sampleIterator++;
  		}
  		msg += String.fromCharCode(letterASCII);
  	}
  };
}]);
