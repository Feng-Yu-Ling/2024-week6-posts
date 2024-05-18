const handleErrorAsync = function handleErrorAsync(func) {

    /*將async function丟進參數，回傳有加catch版本的middleware，用來處理異步操作的錯誤*/

    // func 先將 async fun 帶入參數儲存
    // middleware 先接住 router 資料
    return function (req, res, next) {
        //再執行函式，並增加 catch 條件去捕捉
        // async 本身就是 promise，所以可用 catch 去捕捉異步函式錯誤
        func(req, res, next).catch(
            function (error) {
                /* next()會進到下一個程式堆疊，
                若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
                return next(error);
            }
        );
    };
};

module.exports = handleErrorAsync;