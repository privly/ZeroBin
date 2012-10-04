/**
 * message displayed by the tooltip. This should only be modified via the
 * updateTooltipMessage function.
 * see updateTooltipMessage
 */
var tooltipMessage = "Privly Content"

//Tooltip script 
//powered by jquery (http://www.jquery.com)
//written by Alen Grakalic (http://cssglobe.com)
//for more info visit http://cssglobe.com/post/1695/easiest-tooltip-and-image-preview-using-jquery
this.tooltip = function(){
  
  var tooltipMessageElement = "<p id='tooltip'>" + tooltipMessage + "</p>";
  
  xOffset = 7;
  yOffset = 10;
  $("body").hover(function(e){
    $("body").append(tooltipMessageElement);
    $("#tooltip").css("top",(e.pageY - xOffset) + "px").css("left",(e.pageX + yOffset) + "px").fadeIn("fast").text(tooltipMessage);    
    },
    function(){
        $("#tooltip").remove();
    });  
  $("body").mousemove(function(e){
    $("#tooltip").css("top",(e.pageY - xOffset) + "px").css("left",(e.pageX + yOffset) + "px").text(tooltipMessage);
  });
};

/**
 * Update the tooltip message
 * @param message string The message to place on the tooltip.
 */
function updateTooltipMessage(message) {
  // Update the tooltip for the next time it mouses in/out
  tooltipMessage = message;
}
