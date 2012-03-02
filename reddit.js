/************************
*reddit:
*TYPE: OBJECT (singleton)
*/
var reddit = (function(){
//private stuff

/************************************************************************************
 *variable: XMLHttpFactories
 *TYPE: ARRAY of anonymous functions
 *DESCRIPTION:
 *No need to use manually. Used in createXMLHTTPObject
 *to return XMLHTTP object cross-browsers
 ************************************************************************************/
var XMLHttpFactories = 
    [
        function () {return new XMLHttpRequest()},
        function () {return new ActiveXObject("Msxml2.XMLHTTP")},
        function () {return new ActiveXObject("Msxml3.XMLHTTP")},
        function () {return new ActiveXObject("Microsoft.XMLHTTP")}
    ];
/*************************************************************************************
 *function: parsePostData(postData)
 *@postData: REQUIRED object
 *RETURNS: string of key/value pairs to be appended to a URL
 *  i.e. '?foo=bar&another=thisone'
 *************************************************************************************/
function parsePostData(postData)
    {
        var appendString = '?';
        for(key in postData)
            {
                appendString += key + '=' + postData[key] + '&';
            };
            appendStrTrim = appendString.substring(0, appendString.length-1)
        return appendStrTrim;
    };
/*****************************************
 *FUNCTION: createXMLHTTPObject
 *creates cross-browser XMLHTTP request object
 *called automagically by sendRequest()
 *****************************************/    
function createXMLHTTPObject() 
    {
        var xmlhttp = false;
        for (var i=0;i<XMLHttpFactories.length;i++) {
                try {
                        xmlhttp = XMLHttpFactories[i]();
                }
                catch (e) {
                        continue;
                }
                break;
        }
        return xmlhttp;
    };
/***********************************************************************************************
 *function: sendRequest(url,callback,postData)
 *@url: REQUIRED string - full URL you wish to send request to
 *@callback: REQUIRED - function to be called when request completes
 *@postData: OPTIONAL - string - data as it would be appended to the end of the URL for GET data
 *RETURNS: No return. Fires callback when AJAX request completes.
 *         Parameter passed to callback will either be AJAX data (successful connection)
 *         or HTTP error Code.
 ***********************************************************************************************/
function sendRequest(url,callback,postData) 
    {
    var req = createXMLHTTPObject();
    if (!req) return;
    var method = (postData) ? "POST" : "GET";
    req.open(method,url,true);
    if (postData){
        req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
        if (postData.passwd){
            req.withCredentials = true;
        }
    }
    req.onreadystatechange = function () {
            if (req.readyState != 4) return;
            if (req.status != 200 && req.status != 304) {
                errorCode = 'HTTP error: ' + req.status;
                callback(errorCode);
            }
            
            var response = JSON.parse(req.response)
            if (response.jquery){
                console.log(req.getAllResponseHeaders());
            }
            if(response.data && response.data.modhash){
                reddit.control.setModHash(response.data.modhash )
            }
            if(response.data && response.data.children && typeof callback =='function'){
                callback(response.data.children);
            }else if(response.data && typeof callback=='function'){
                callback(response.data);
            }else if(typeof callback== 'function'){
                callback(response);
            };
    }
    if (req.readyState == 4) return;
    var postString = parsePostData(postData);
    req.send(postString);
    };
    /***************************************************************************
     *User
     *TYPE: OBJECT
     *PROPERTIES:
     *@modHash: string. Required for making authenticated requests to Reddit API
     *@data: user object passed from Reddit. See Reddit API documentation
     ***************************************************************************/
    user = {
        modHash : '',
        name: '',
        password: '',
        hasMail: '',
        data: {},
        setHasMail: function(hasmail){
            this.hasMail = hasmail;
        }
    }
//public:
var instance = {
        read : {
            //var subReddit = sr ? sr : 'frontpage';
            fetchReddit : function(sr, count, callback){
                srCount = count ? count : '25'
                var sub;
                if (sr == 'frontpage'){
                        sub = '';
                }else{
                        sub = 'r/' + sr + '/';
                };
                sendRequest("http://www.reddit.com/"+sub+ ".json?count=" + srCount, callback)
            },
            fetchById : function(type, id, callback){
                fullName = type + '_' + id;
                sendRequest("http://www.reddit.com/by_id/" + fullName + ".json", callback);
            },
            fetchCommentsById : function(id, callback){
                sendRequest("http://www,reddit.com/comments/" + id + ".json", callback)
            },
            showReddit : function(sr){
                var sub;
                if (sr == 'frontpage'){
                     sub = '';
                }else{
                    sub = 'r/' + sr;
                };
            },
            myReddits: function(callback){
                    url = 'http://www.reddit.com/reddits/mine.json';
                    sendRequest(url, callback);
                },
            defaultReddits: function(callback){
                    url = 'http://www.reddit.com/reddits/.json';
                    sendRequest(url, callback);
                },
            fetchProfile: function(user, callback){
                var url;
                if(user == 'me'){
                    url = 'http://www.reddit.com/api/me.json';
                }else{
                    url = 'http://www.reddit.com/user/' + user + '/about.json';
                }
                sendRequest(url, callback);
            },
            retrieveMail: function(onlyNew, callback){
                var url = 'http://www.reddit.com/message/inbox/.json';
                sendRequest(url, function(msg){
                    var messages = [];
                    if(onlyNew && msg.length > 0){
                        for(i=0;i<msg.length;i++){
                            if(msg[i].data.new){
                                messages.push(msg[i]);
                            }
                        }
                    }else{
                        messages = msg; 
                    }
                    callback(messages);
                });
            }
        },
        
//reddit API functions
    control : {
    //log in function
    login : function(user, password, remember, callback){
        var logonURL = 'https://ssl.reddit.com/api/login/' + user;
        
        var postData = 
            {
            api_type: 'json',
            user : user,
            passwd : password
            };
            sendRequest(logonURL, function(response){
                /*if(chrome.cookies){
                    chrome.cookies.set({
                        url: 'http://www.reddit.com',
                        name: 'reddit_session',
                        domain: '.reddit.com',
                        value: reddit.control.fetchModHash()
                    })
                }*/
                console.log('login response');
                console.log(response);
                reddit.read.fetchProfile('me', callback)}, postData);
        if(remember){
            localStorage['userName'] = user;
            localStorage['password'] = password;
        };

    },


     markMailRead: function(mailId, callback){
        var url = 'http://www.reddit.com/api/read_message/';
        postData =
        {
            api_type: 'json',
            id: mailId,
            uh: reddit.control.fetchModHash(),
            jsonp: alert
        };
        sendRequest(url, callback, postData);
        
    },
    
    upVote : function(id, callback){

    },
    downVote : function(id, callback){

    },
    //error handler
    handleError : function(error){
        console.log(error);
    },
    setModHash : function(mh){
        user.modHash = mh;
    },
    fetchModHash : function(){
        return(user.modHash);
    },
    setUserName : function(un){
        user.modHash = un;
    },
    fetchUserName : function(){
        return user.name;
    },
    setPassword : function(pw){
        user.password = pw;
    },
    setUserData : function(ud){
        user.data = ud;
    },
    fetchUserData : function(){
        return user.data;
    },
    setLastRequestData: function(data){
        reddit.control.lastRequestData = data;
    },
    fetchLastRequestData: function(){
        return reddit.control.lastRequestData;
    },
    fetchHasMail: function(){
        return user.hasMail;
    }

}
}
return (instance);
})();