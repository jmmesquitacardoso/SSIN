var app = angular.module('FileApp', ['ngFileReader']);
app.config(["$compileProvider", function($compileProvider) {

    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(blob:|data:audio|data:image)/);

}]);

app.controller('fileCtrl', ['$scope', '$sce', function($scope, $sce){

  $scope.selectedMode = 'image';

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
      console.log("Unchanged image width = " + img.width);
      document.getElementById("myCanvas").width = img.width;
      document.getElementById("myCanvas").height = img.height;
			context.clearRect(0, 0, canvas.width, canvas.height);
			img.onload = function(){
				context.drawImage(img, 0, 0);
				var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
				var data = imageData.data;
				encodeImage(data, $scope.msg, 8);
				console.log("\n\n\n");
				var decodedMsg = decodeImage(data);
				console.log("DECODED MESSAGE: " + decodedMsg);

      			// overwrite original image
      			context.putImageData(imageData, 0, 0);
      		};
		}
		else if(file.type.indexOf("audio") != -1){ //Audio file
			$scope.sound = $sce.trustAsResourceUrl(e.target.result);
			var newSound = encodeSound(e.target.result, $scope.msg, 8);
			var msg = decodeSound(newSound);
			$scope.modifiedSound = $sce.trustAsResourceUrl(newSound);
			console.log("MSG = " + msg);
		}
        else if (file.type.indexOf("video") !== -1){
            $scope.video = $sce.trustAsResourceUrl(e.target.result);
			var videoData = e.target.result;

			var encodeVideo = function(videoData, msg, nBits){
				var binaryIndex = videoData.indexOf("base64,"),
					binaryVideo = videoData.substring(binaryIndex + 7),
					decoded = decode64(binaryVideo),
					decimalArray = [];

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
					for(var i = firstByte; i < lastByte; i++){
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

			var newVideo = encodeVideo(angular.copy(videoData),$scope.msg, 8);
			$scope.modifiedVideo = $sce.trustAsResourceUrl(newVideo);

			var decodedVideo = function(newVideo,nBits){

				var binaryIndex = newVideo.indexOf("base64,"),
					binaryVideo = newVideo.substring(binaryIndex + 7),
					decoded = decode64(binaryVideo),
					decimalArray = [];

				for(var i = 0; i < decoded.length; i++){
					decimalArray[i] = decoded[i].charCodeAt(0);
				}

				var msg = "",
					done = false;

				var decodeVideoFrame = function(firstByte, lastByte){
					for(var i = firstByte; i < lastByte; i++){

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

			var decodedMessage = decodedVideo(newVideo, 8).split(""),
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

			imageData[3] = nBits;
      imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 13; //end of text character
      counter++;
      imageData[counter * 5 - 3 * Math.floor(counter / 3)] = 27; //end of text character
  };

  var decodeImage = function(imageData){
  	var counter = 0;
  	var byteIndex = 0;
  	var msg = "";
  	var foundFirstStop = false;
		var nBits = imageData[3];
		console.log("nBits = " + nBits);
  	var andValue = 2 * Math.pow(2, nBits - 1) - 1;


  	while(1){
  		var letterASCII = 0;
  		for(var bitIterator = 0; bitIterator < 8; bitIterator += nBits, counter++){
  			console.log("--- bitIterator = " + bitIterator + " ---");
  			byteIndex = counter * 5 - 3 * Math.floor(counter / 3);
  			if(foundFirstStop === true) {
  				if(imageData[byteIndex] === 27) {
  					console.log("ENDING");
					$scope.decodedMessage = msg;
  					return msg;
  				}
  			} else{
						if (imageData[byteIndex] === 13) {
							foundFirstStop = true;
							console.log("FOUND ONE");
							continue;
						}
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

			// Se a mensagem for maior que o numero de bits do som
			if (dataBlockSize < (msg.length*8/nBits)) {
				alert("Mensagem demasiado grande");
				return;
			}

  		var nSamples = dataBlockSize / sampleBits;
  		var sampleIterator = 45;
			decimalArray[sampleIterator] = nBits;
			sampleIterator++;

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
					console.log("AFTER: " + decimalArray[sampleIterator]);
				}else{
					console.log("BEFORE: " + decimalArray[sampleIterator]);
					decimalArray[sampleIterator] &= (~andValue);

					console.log("AFTER: " + decimalArray[sampleIterator]);
				}
			  sampleIterator++;
			}
		}

		decimalArray[sampleIterator] = 13;
		sampleIterator++;
		decimalArray[sampleIterator] = 27;
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

			console.log("\n\n\n\n\n\n ENTERED DECODE SOUND!!!!11111!!!ELEVEN");

  		for(var i = 0; i < decoded.length; i++){
  			decimalArray[i] = decoded[i].charCodeAt(0);
  		}

  		var sampleBits = (decimalArray[35] << 8) | decimalArray[34];

  		console.log("-----DECODE, " + sampleBits + " bits/sample");
  		console.log(decimalArray[34]);
  		console.log(decimalArray[35]);
  		console.log(decimalArray.length);

			var nBits = decimalArray[45];
  		var andValue = 2 * Math.pow(2, nBits - 1) - 1;
			console.log("nBits = " + nBits);
			sampleIterator++;

  		while(1) {
  		var letterASCII = 0;
  		for (var bitIterator = 0; bitIterator < 8; bitIterator += nBits) {
  			console.log("---BIT " + bitIterator + " -----");
  			if (foundFirstStop === true) {
  				if (decimalArray[sampleIterator] === 27) {
					$scope.decodedMessage = msg;
  					return msg;
  				}
  			} else {
					if (decimalArray[sampleIterator] === 13) {
	  					foundFirstStop = true;
	  					console.log("FOUND ONE STOP");
	  					continue;
					}
  				console.log("SOUND DATA = " + decimalArray[sampleIterator]);
  				var byteValue = decimalArray[sampleIterator] & andValue; //LSB
  				console.log("byteValue = " + byteValue);
  				byteValue = byteValue << bitIterator;
  				letterASCII |= byteValue;
  			}
  			sampleIterator++;
  		}
  		console.log("sampleIterator = " + sampleIterator);
  		console.log(letterASCII);
  		msg += String.fromCharCode(letterASCII);
  	}
  };
}]);
