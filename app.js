/*在Express應用程式中使用process.on()方法設置事件監聽器，
進行監聽和處理各種事件，例如處理未捕獲的異常、處理程式即將退出等情況。*/

/*在Node.js中，當一個錯誤沒有被任何try-catch區塊捕獲時，就會觸發"uncaughtException"事件。
"uncaughtException"監聽器通常放在最頂端，確保應用程式在啟動時就能捕捉到任何可能的異常*/

// 程式出現重大錯誤時
process.on("uncaughtException", err=>{
    // 記錄錯誤下來，等到服務都處理完後，停掉該process
    console.error("Uncaughted Exception!");
    console.error(err.name);
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
});

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const dotenv = require("dotenv");
// 指定.env檔所在的位置，並將.env檔案中的環境變數載入到process.env中
dotenv.config({path:"./config.env"});

var cors = require('cors')
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
// 貼文路由
const postRouter = require('./routes/posts');

// 資料庫設定開始
const mongoose = require('mongoose');

const DB = process.env.DATABASE.replace(
    "<password>",
    process.env.DATABASE_PASSWORD
)


// 雲端資料庫
mongoose.connect(DB) // port號/後面接資料庫名稱，若不存在則會新增
    .then(res=> console.log("連線資料成功"));


var app = express();

app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// 路由
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/posts', postRouter);



// 404
app.use((req, res, next) => {
    res.status(404).json({
        "status":"false",
        "message":"404 無此網站路由"
    })
});

/*建立一個錯誤處理middleware，根據不同的環境處理錯誤，
區分開發和生產環境，以及對mongoose的錯誤進行特殊處理*/

// express錯誤處理
// 自己設定的err錯誤
const resErrorProd = (err, res)=>{
    if(err.isOperational){
        res.status(err.statusCode).json({
            message: err.message
        })
    }
    else{
        // log紀錄
        console.error("出現重大錯誤", err);
        // 送出罐頭預設訊息
        res.status(500).json({
            status: "error",
            message: "系統錯誤，請洽系統管理員"
        })
    }
}
// 開發環境錯誤
const resErrorDev = (err, res)=>{
    res.status(err.statusCode).json({
        message: err.message,
        error: err,
        stack: err.stack
    })
}

// 錯誤處理
app.use(function(err, req, res, next){
    // dev
    err.statusCode = err.statusCode || 500;
    if(process.env.NODE_ENV === "dev"){
        return resErrorDev(err, res);
    }
    // production mongoose
    if(err.name === "ValidationError"){
        err.message = "資料欄位未填寫正確，請重新輸入！";
        err.isOperational = true;
        return resErrorProd(err, res);
    }
    resErrorProd(err, res) // 若以上條件都不符合，則調用resErrorProd()處理錯誤
})

/*在Express應用程式中使用process.on()方法設置事件監聽器，
進行監聽和處理各種事件，例如處理未捕獲的異常、處理程式即將退出等情況*/

/*在Node.js中，當一個promise被拒絕並且未被處理時，就會觸發"unhandledRejection"。
"unhandledRejection"監聽器通常放在最底端，原因如下：
1.確保所有promise操作都已被初始化並且可被此監聽器覆蓋
2.避免過早攔截，若將"unhandledRejection"放在最頂端，可能會導致誤判未處理*/

// 未捕捉到的catch
process.on("unhandledRejection", (reason, promise)=>{
    console.error("未捕捉到的rejection:", promise, "原因:", reason);
})

module.exports = app;
