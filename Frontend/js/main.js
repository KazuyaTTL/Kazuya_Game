var debugmode = false;

var states = Object.freeze({
   SplashScreen: 0,
   GameScreen: 1,
   ScoreScreen: 2
});

var currentstate; // Biến lưu trạng thái hiện tại của game

// Các biến vật lý và vị trí cho người chơi
var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6; // Lực nhảy
var flyArea = $("#flyarea").height();  // Chiều cao của khu vực bay
// Điểm số
var score = 0;
var highscore = 0;
// Cấu hình ống cống
var pipeheight = 90;
var pipewidth = 52;
var pipes = new Array(); 

var replayclickable = false;

//// Khởi tạo âm thanh bằng thư viện Buzz
var volume = 30;
var soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

//loops
var loopGameloop;
var loopPipeloop;

$(document).ready(function() {
   if(window.location.search == "?debug")
      debugmode = true;
   if(window.location.search == "?easy") // Chế độ dễ với khe hở ống lớn hơn
      pipeheight = 200;

   //Lưu điểm cao nhất
   var savedscore = getCookie("highscore");
   if(savedscore != "")
      highscore = parseInt(savedscore);

   //Bắt đầu với màn hình chờ
   showSplash();
});

function getCookie(cname)
{
   var name = cname + "=";
   var ca = document.cookie.split(';');
   for(var i=0; i<ca.length; i++)
   {
      var c = ca[i].trim();
      if (c.indexOf(name)==0) return c.substring(name.length,c.length);
   }
   return "";
}

function setCookie(cname,cvalue,exdays)
{
   var d = new Date();
   d.setTime(d.getTime()+(exdays*24*60*60*1000));
   var expires = "expires="+d.toGMTString();
   document.cookie = cname + "=" + cvalue + "; " + expires;
}

function showSplash()
{
   currentstate = states.SplashScreen;

   //Mặc định
   velocity = 0;
   position = 180;
   rotation = 0;
   score = 0;

   $("#player").css({ y: 0, x: 0 });
   updatePlayer($("#player")); // Cập nhật vị trí ban đầu của chim

   soundSwoosh.stop();
   soundSwoosh.play();

   // Xóa các ống cống cũ
   $(".pipe").remove();
   pipes = new Array();

   //Chạy lại animation CSS
   $(".animated").css('animation-play-state', 'running');
   $(".animated").css('-webkit-animation-play-state', 'running');

   //Hiển thị màn hình chờ
   $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

function startGame()
{
   currentstate = states.GameScreen;

   //fade out the splash
   $("#splash").stop();
   $("#splash").transition({ opacity: 0 }, 500, 'ease');

   //update điểm cao nhất
   setBigScore();

   //debug mode?
   if(debugmode)
   {
      //show the bounding boxes
      $(".boundingbox").show();
   }

   //Khởi động vòng lặp
   var updaterate = 1000.0 / 60.0 ; //// Tần suất cập nhật
   loopGameloop = setInterval(gameloop, updaterate);
   loopPipeloop = setInterval(updatePipes, 1400); // Vòng lặp tạo ống mới mỗi 1.4 giây

   //Nhảy một cái khi bắt đầu
   playerJump();
}

function updatePlayer(player)
{
   rotation = Math.min((velocity / 10) * 90, 90);
   $(player).css({ rotate: rotation, top: position });
}

function gameloop() {
   var player = $("#player");
   velocity += gravity; // Vận tốc tăng dần do trọng lực
   position += velocity; // Vị trí thay đổi theo vận tốc

   //update
   updatePlayer(player);

   //Tạo bounding box
   var box = document.getElementById('player').getBoundingClientRect();
   var origwidth = 50.0; //Chiều rộng gốc
   var origheight = 32.0; //Chiều cao gốc

   // Điều chỉnh kích thước bounding box khi chim xoay   
   var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
   var boxheight = (origheight + box.height) / 2;
   var boxleft = ((box.width - boxwidth) / 2) + box.left;
   var boxtop = ((box.height - boxheight) / 2) + box.top;
   var boxright = boxleft + boxwidth;
   var boxbottom = boxtop + boxheight;

   //Hiển thị playerbox
   if(debugmode)
   {
      var boundingbox = $("#playerbox");
      boundingbox.css('left', boxleft);
      boundingbox.css('top', boxtop);
      boundingbox.css('height', boxheight);
      boundingbox.css('width', boxwidth);
   }

   //Khi chim chạm đất
   if(box.bottom >= $("#land").offset().top)
   {
      playerDead();
      return; //chạm đất
   }

   //Khi chim cố vượt qua trần
   var ceiling = $("#ceiling");
   if(boxtop <= (ceiling.offset().top + ceiling.height()))
      position = 0; //chạm trần

   //giới hạn vị trí, không thể vượt qua trần
   if(pipes[0] == null)
      return;

   //xác định bounding box của khu vực bên trong ống tiếp theo
   var nextpipe = pipes[0];
   var nextpipeupper = nextpipe.children(".pipe_upper");

   var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
   var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
   var piperight = pipeleft + pipewidth;
   var pipebottom = pipetop + pipeheight;

   if(debugmode)
   {
      var boundingbox = $("#pipebox");
      boundingbox.css('left', pipeleft);
      boundingbox.css('top', pipetop);
      boundingbox.css('height', pipeheight);
      boundingbox.css('width', pipewidth);
   }

   
   if(boxright > pipeleft) //Chim đã đi vào vùng ngang của ống
   {
      if(boxtop > pipetop && boxbottom < pipebottom) // Chim nằm trong khe hở -> Không va chạm
      {


      }
      else
      {
         // Va chạm với ống
         playerDead();
         return;
      }
   }


   //Khi chim vượt qua ống
   if(boxleft > piperight)
   {
      // Xóa ống đã qua khỏi mảng
      pipes.splice(0, 1);
      //Tăng một điểm
      playerScore();
   }
}

//Space
$(document).keydown(function(e){
   if(e.keyCode == 32) //Phím space
   {
      //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
      if(currentstate == states.ScoreScreen)
         $("#replay").click(); //chơi lại
      else
         screenClick(); //nhảy hoặc bắt đầu game
   }
});

//Chạm màn hình và Chuột
if("ontouchstart" in window)
   $(document).on("touchstart", screenClick);
else
   $(document).on("mousedown", screenClick);

function screenClick()
{
   if(currentstate == states.GameScreen)
   {
      playerJump(); // Nếu đang chơi, chim nhảy
   }
   else if(currentstate == states.SplashScreen)
   {
      startGame(); // Nếu ở màn hình chờ, bắt đầu game
   }
}

function playerJump()
{
   velocity = jump; // Đặt lại vận tốc để chim bay lên
   //phát ra âm thanh khi chim vỗ cánh
   soundJump.stop();
   soundJump.play();
}
//Điểm (số lớn)
function setBigScore(erase)
{
   var elemscore = $("#bigscore");
   elemscore.empty();

   if(erase)
      return;

   var digits = score.toString().split('');    // Chuyển số thành mảng các chữ số
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}
//Điểm (số nhỏ)
function setSmallScore()
{
   var elemscore = $("#currentscore");
   elemscore.empty();

   var digits = score.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}
//Điểm lớn nhất 
function setHighScore()
{
   var elemscore = $("#highscore");
   elemscore.empty();

   var digits = highscore.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal()
{
   var elemmedal = $("#medal");
   elemmedal.empty();

   if(score < 10) 
      return false;

   if(score >= 10)
      medal = "bronze";
   if(score >= 20)
      medal = "silver";
   if(score >= 30)
      medal = "gold";
   if(score >= 40)
      medal = "platinum";

   elemmedal.append('<img src="assets/medal_' + medal +'.png" alt="' + medal +'">');

   //Trả về true để báo đã có huy chương
   return true;
}

function playerDead()
{
   //stop animating everything!
   $(".animated").css('animation-play-state', 'paused');
   $(".animated").css('-webkit-animation-play-state', 'paused');

   //drop the bird to the floor
   var playerbottom = $("#player").position().top + $("#player").width(); //we use width because he'll be rotated 90 deg
   var floor = flyArea;
   var movey = Math.max(0, floor - playerbottom);
   $("#player").transition({ y: movey + 'px', rotate: 90}, 1000, 'easeInOutCubic');

   //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
   currentstate = states.ScoreScreen;

   //destroy our gameloops
   clearInterval(loopGameloop);
   clearInterval(loopPipeloop);
   loopGameloop = null;
   loopPipeloop = null;

   //mobile browsers don't support buzz bindOnce event
   if(isIncompatible.any())
   {
      //skip right to showing score
      showScore();
   }
   else
   {
      //play the hit sound (then the dead sound) and then show score
      soundHit.play().bindOnce("ended", function() {
         soundDie.play().bindOnce("ended", function() {
            showScore();
         });
      });
   }
}

function showScore()
{
   //unhide us
   $("#scoreboard").css("display", "block");

   //remove the big score
   setBigScore(true);

   //have they beaten their high score?
   if(score > highscore)
   {
      //yeah!
      highscore = score;
      //save it!
      setCookie("highscore", highscore, 999);
   }

   //update the scoreboard
   setSmallScore();
   setHighScore();
   var wonmedal = setMedal();

   //SWOOSH!
   soundSwoosh.stop();
   soundSwoosh.play();

   //show the scoreboard
   $("#scoreboard").css({ y: '40px', opacity: 0 }); //move it down so we can slide it up
   $("#replay").css({ y: '40px', opacity: 0 });
   $("#scoreboard").transition({ y: '0px', opacity: 1}, 600, 'ease', function() {
      //When the animation is done, animate in the replay button and SWOOSH!
      soundSwoosh.stop();
      soundSwoosh.play();
      $("#replay").transition({ y: '0px', opacity: 1}, 600, 'ease');

      //also animate in the MEDAL! WOO!
      if(wonmedal)
      {
         $("#medal").css({ scale: 2, opacity: 0 });
         $("#medal").transition({ opacity: 1, scale: 1 }, 1200, 'ease');
      }
   });

   //make the replay button clickable
   replayclickable = true;
}

$("#replay").click(function() {
   //make sure we can only click once
   if(!replayclickable)
      return;
   else
      replayclickable = false;
   //SWOOSH!
   soundSwoosh.stop();
   soundSwoosh.play();

   //fade out the scoreboard
   $("#scoreboard").transition({ y: '-40px', opacity: 0}, 1000, 'ease', function() {
      //when that's done, display us back to nothing
      $("#scoreboard").css("display", "none");

      //start the game over!
      showSplash();
   });
});

function playerScore()
{
   score += 1;
   //play score sound
   soundScore.stop();
   soundScore.play();
   setBigScore();
}

function updatePipes()
{
   //Do any pipes need removal?
   $(".pipe").filter(function() { return $(this).position().left <= -100; }).remove()

   //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
   var padding = 80;
   var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
   var topheight = Math.floor((Math.random()*constraint) + padding); //add lower padding
   var bottomheight = (flyArea - pipeheight) - topheight;
   var newpipe = $('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
   $("#flyarea").append(newpipe);
   pipes.push(newpipe);
}

var isIncompatible = {
   Android: function() {
   return navigator.userAgent.match(/Android/i);
   },
   BlackBerry: function() {
   return navigator.userAgent.match(/BlackBerry/i);
   },
   iOS: function() {
   return navigator.userAgent.match(/iPhone|iPad|iPod/i);
   },
   Opera: function() {
   return navigator.userAgent.match(/Opera Mini/i);
   },
   Safari: function() {
   return (navigator.userAgent.match(/OS X.*Safari/) && ! navigator.userAgent.match(/Chrome/));
   },
   Windows: function() {
   return navigator.userAgent.match(/IEMobile/i);
   },
   any: function() {
   return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
   }
};
