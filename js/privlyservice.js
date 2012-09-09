/**
 * This script defines the Privly-specific functionality for the Privly's 
 * ZeroBin fork. It handles posting content to the server, getting content 
 * from the server, sending resize messages, and fireing URL events.
 *
 * Success callbacks use the response's structured_content JSON document.
 * If the request fails {error:"message"} is used.
 */

/** 
 * Get, decrypt, display, then resize for content.
 */
function privlyGetContent() {
  $.getJSON(cipherTextUrl())
    .success( 
      function (data, textStatus, jqXHR) {
        stateExistingPaste();
        displayMessages(pageKey(), data.structured_content);
        postResizeMessage();
      })
    .error(
      function (data, textStatus, jqXHR) {
      showError('Could not retrieve your content. It might not exist, you might not have access, or there was a server error.');
    });
  return;
}

/**
 * Fire an event containing the Privly URL for extensions to capture.
 * This is used in posting dialogs where the application pops up for the
 * user to create a post.
 */
function firePrivlyURLEvent(url) {
  var element = document.createElement("privlyEventSender");  
  element.setAttribute("privlyUrl", url);  
  document.documentElement.appendChild(element);  

  var evt = document.createEvent("Events");  
  evt.initEvent("PrivlyUrlEvent", true, false);  
  element.dispatchEvent(evt);
}

/**
 * Post content to the content server and generate the new resource's URL.
 * This function should only be called by privlyPostContent();
 *
 * @param data_to_send JSON The JSON document getting posted to the server.
 * @param randomkey The random key used to encrypt the content. This parameter
 * is never sent to the remote server, but it is appended to the generated
 * URL.
 * Access: private
 */
function privlyPostContentWithCSRFToken(data_to_send, randomkey) {
  
  var postingAddress = window.location.protocol + "//" + window.location.host + "/posts";
  
  sharesFormSubmit($('#share_identity'),
                   $('#share_share_csv'),
                   $('#identity_provider_name'));
  var share = {
                can_show: $("#share_can_show").is(':checked'),
                can_update: $("#share_can_update").is(':checked'),
                can_destroy: $("#share_can_destroy").is(':checked'),
                can_share: $("#share_can_share").is(':checked'),
                identity: $("#share_identity").val(),
                share_csv: $("#share_share_csv").val(),
                identity_provider_name: $("#identity_provider_name").val()
              };
  
  $.ajax({
    data: {post:{structured_content: data_to_send, share: share, 
      public: $("#post_public").is(':checked')}},
    type: "POST",
    url: postingAddress,
    contentType: "application/x-www-form-urlencoded; charset=UTF-8",
    dataType: "json",
    accepts: "json",
    success: function (data, textStatus, jqXHR) {
      if (jqXHR.getResponseHeader("X-Privly-Url") !== undefined) {
          stateExistingPaste();
          var params = {"privlyLinkKey": randomkey, 
          "privlyCiphertextURL": jqXHR.getResponseHeader("X-Privly-Url"),
          "privlyInject1": true};
          var url = scriptLocation() + '#' + hashToParameterString(params);
          showStatus('');
          
          firePrivlyURLEvent(url);
          
          $('div#pastelink').html('Copy this address to share <br /> <a href="' + url + '" target="_blank">' + url + '</a>').show();
          setElementText($('div#cleartext'), $('textarea#message').val());
          urls2links($('div#cleartext'));
          showStatus('');
          $('div#cleartext').delay(800).slideUp("slow");
      }
      else if (data.status==1) {
          showError('Could not create paste: ' + data.message);
      }
      else {
          showError('Could not create paste.');
      }
    },
    error: function (data, textStatus, jqXHR) { 
      showError('Data could not be sent (serveur error or not responding).');
    }
  });
}

/**
 * Indicates whether post request are awaiting initialization of the CSRF Token.
 * The CSRF token is a counter measure for Cross Site Request Forgery, and is 
 * required of all post requests on the content server.
 * When multiple post requests are generated for the server, the CSRF token
 * might not have been returned yet despite being requested. This variable 
 * ensures that multiple requests are not sent simultaneously.
 * Access: private variable.
 *
 */
var privlyCSRFTokenPending = false;

/**
 * Indicates when a request has successfully set the CSRF token
 * Access: private variable.
 */
var privlyCSRFTokenComplete = false;

/**
 * Requests CSRF token on first call before calling 
 * privlyPostContentWithCSRFToken(). Subsequent calls to
 * this function will immediatly call privlyPostContentWithCSRFToken().
 *
 * @param data_to_send JSON The JSON document getting posted to the server.
 * @param randomkey The random key used to encrypt the content. This parameter
 * is never sent to the remote server, but it is appended to the generated
 * link.
 *
 */
function privlyPostContent(data_to_send, randomkey) {
  
  // This makes the post wait until the last CSRF
  // token request completes or fails.
  if ( privlyCSRFTokenPending ) {
    setTimeout(
      privlyPostContent(data_to_send, randomkey),
      1000);
    return;
  }
  
  // We already set the CSRF token, so we can make the post request
  if ( privlyCSRFTokenComplete ) {
    privlyPostContentWithCSRFToken(data_to_send, randomkey);
    return;
  }
  
  privlyCSRFTokenPending = true;
  
  var csrfTokenAddress = window.location.protocol + "//" + window.location.host + "/posts/get_csrf";
  
  $.ajax({
    url: csrfTokenAddress,
    data: {},
    dataType: "json",
    accepts: "json",
    success: function (csrf_json, textStatus, jqXHR) {
      $.ajaxSetup({
        beforeSend: function(xhr) {
          xhr.setRequestHeader('X-CSRF-Token', csrf_json.csrf);
      }});
      privlyPostContentWithCSRFToken(data_to_send, randomkey);
      privlyCSRFTokenPending = false;
      privlyCSRFTokenComplete = true;
    },
    error: function (data, textStatus, jqXHR) { 
      showError('Could not create post (CSRF Token service not available).');
      privlyCSRFTokenPending = false;
    }
  });
}

/**
 * Tell the parent document (if it exists), the name and height
 * of this document. First it posts a message to the parent iframe,
 * then dispatches an event.
 */
function postResizeMessage() {
  
  if (top !== self) {
    var newHeight = document.getElementById("privlyHeightWrapper").offsetHeight;
    parent.postMessage(window.name+","+newHeight,"*");

    var evt = document.createEvent("Events");  
    evt.initEvent("IframeResizeEvent", true, false);
    var element = document.createElement("privElement");
    element.setAttribute("height", newHeight);  
    element.setAttribute("frameName", window.name);  
    document.documentElement.appendChild(element);    
    element.dispatchEvent(evt);
  }
}

