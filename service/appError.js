/*建立一個自定義的錯誤物件，包含了HTTP狀態碼、錯誤訊息以及該錯誤是否是操作性的。
透過這樣更方便處理程式碼中的錯誤，提高程式碼的可讀性和可維護性。*/

const appError = (httpStatus, errMessage, next)=>{
    const error = new Error(errMessage);
    error.statusCode = httpStatus;
    error.isOperational = true;
    return error;
}

module.exports = appError;