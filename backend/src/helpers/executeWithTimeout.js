const executeWithTimeout = async (fn, timeout = 12_0000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error("La función no completó su ejecución en el tiempo permitido.")
      );
    }, timeout);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};
