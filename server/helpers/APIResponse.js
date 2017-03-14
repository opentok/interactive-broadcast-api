import httpStatus from 'http-status';

const defaultOptions = { skipNotFoundValidation: true };

const getAPIResponse = (fn, options = defaultOptions) =>
  (req, res) => {
    fn(req, res)
      .then(body => res.status(body || options.skipNotFoundValidation ? httpStatus.OK : httpStatus.NOT_FOUND).send(body))
      .catch(error => res.status(httpStatus.INTERNAL_SERVER_ERROR).send(error));
  };

export default getAPIResponse;
