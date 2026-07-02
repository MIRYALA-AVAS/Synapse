const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Something went wrong';

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ status: 'error', message, code });
};

export default errorHandler;
