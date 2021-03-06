var object_filled_keys_count = require('../helpers/object-filled-keys-count');
var is_valid_moment_object = require('../helpers/is-valid-moment-object');
var filterByCustomFilters = require('../filters/custom-filters');
var clone = require('clone');
var moment = require('moment');

module.exports = function(data, e) {

  if (e) {

    let query = this.query;

    this.setPage(1, true);

    var name = this.getName(e.target.name);
    var value = typeof e.target.value==='object'?e.target.value:'' + e.target.value;

    if (name) {
      query[name] = value;
    } else {
      query = value;
    }

    this.vuex?
    this.commit('SET_FILTER', query):
    this.query = query;

    this.updateState('query', query);

    if (name) {
      this.dispatch('filter', {name, value});
      this.dispatch(`filter::${name}`, value);
    } else {
      this.dispatch('filter', value);
    }

  }

  var query = this.query;

  var totalQueries = !query?0:1;

  if (!this.opts) return data;

  if (this.opts.filterByColumn)  {
    totalQueries = object_filled_keys_count(query);
  }

  var value;
  var found;
  var currentQuery;
  var dateFormat = this.opts.dateFormat;
  var filterByDate;
  var isListFilter;


  var data = filterByCustomFilters(data, this.opts.customFilters, this.customQueries);

  if (!totalQueries) return data;

  return data.filter(function(row, index) {

    found = 0;

    this.filterableColumns.forEach(function(column) {

      filterByDate = this.opts.dateColumns.indexOf(column)>-1 && this.opts.filterByColumn;
      isListFilter = this.isListFilter(column) && this.opts.filterByColumn;

      value = getValue(row[column], filterByDate, dateFormat);

      currentQuery = this.opts.filterByColumn?query[column]:query;

      currentQuery = setCurrentQuery(currentQuery);

      if (currentQuery && foundMatch(currentQuery, value, isListFilter)) found++;

    }.bind(this));

    return found>=totalQueries;

  }.bind(this));
}

function setCurrentQuery(query) {

  if (!query) return '';

  if (typeof query=='string')
    return query.toLowerCase();

  // Date Range

  return query;
}

function foundMatch(query, value, isListFilter) {

  if (['string','number'].indexOf(typeof value)>-1) {
    value = String(value).toLowerCase();
  }

  // List Filter
  if (isListFilter) {
    // XXX MODIFIED BY RESULTO (contains instead of exact match)
    if (query.lastIndexOf('invalue:', 0) === 0) {
      return value.indexOf(query.substr(8))>-1;
    } else {
      return value==query;
    }
  }

  //Text Filter
  if (typeof value==='string') {
    return value.indexOf(query)>-1;
  }

  // Date range

  if (is_valid_moment_object(value)) { 
    var start = moment(query.start,'YYYY-MM-DD HH:mm:ss');
    var end = moment(query.end,'YYYY-MM-DD HH:mm:ss'); 
    
    return value >= start && value <= end;
  }
 
  
  if (typeof value==='object') {

    for (var key in value) {
       if (foundMatch(query, value[key])) return true;
    }  

    return false;
  }

  return (value>=start && value<=end);
}

function getValue(val, filterByDate, dateFormat) {

  if (is_valid_moment_object(val)) {

    if (filterByDate) return val;
    return val.format(dateFormat);
  }

    return val;

}
