const linkUrl = "https://link.opentargets.io/";

const getQuery = queryItems => queryItems.map(s => `'${s.key}'`).join(" AND ");

export const getAggregationsData = queryItems =>
  fetch(`${linkUrl}search?query=${getQuery(queryItems)}&aggs=true&size=0`).then(res => res.json());

export const getPublicationsData = (queryItems, after, afterId) => {
  const query = `${linkUrl}search?query=${getQuery(queryItems)}${
    after && afterId ? `&search_after=${after}&search_after_id=${afterId}` : ""
  }`;
  return fetch(query).then(res => res.json());
};

export const getStats = queryItems =>
  fetch(`${linkUrl}search?query=${getQuery(queryItems)}&size=0`).then(res => res.json());

export const getPublicationAbstract = pmId =>
  fetch(`${linkUrl}entity/markedtext/${pmId}`).then(res => res.json());

export const getSimilarPublications = pmId =>
  fetch(`${linkUrl}document-more-like-this/${pmId}`).then(res => res.json());
