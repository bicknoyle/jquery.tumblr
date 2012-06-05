/**
 * jquery.tumby.js
 *
 * Consumes a tumblr feed and places it as HTML on your site, allowing
 * you to make a super customizable tumblr widget for your website.
 *
 * This code is a stripped down port of the fantastic jquery.tweet.js
 * (see: http://tweet.seaofclouds.com/ or https://github.com/seaofclouds/tweet)
 */
$.fn.tumby = function(o)
{
    var s = $.extend({
        hostname: null,   // [string] The hostname of your blog (ex: fyeahtumby.tumblr.com)
        options: { },     // [object] key:val of options to pass the tumblr API, see http://www.tumblr.com/docs/en/api/v1#api_read for details
        template: ''      // [string or function] template used to construct each post <li> - see code for available {vars}
    }, o);

    // Expand values inside simple string templates with {placeholders}
    function t(template, info)
    {
        if (typeof template === 'string')
        {
            var result = template;
            for(var key in info)
            {
                var val = info[key];
                result = result.replace(new RegExp('{'+key+'}','g'), val === null ? '' : val);
            }
            return result;
        } else return template(info);//template can be a function too!
    }
    // Export the t function for use when passing a function as the 'template' option
    $.extend({tumby: {t: t}});

    function format_relative_time(time_ago)
    {
        if ( time_ago.days > 2 )     return 'about ' + time_ago.days + ' days ago';
        if ( time_ago.hours > 24 )   return 'about a day ago';
        if ( time_ago.hours > 2 )    return 'about ' + time_ago.hours + ' hours ago';
        if ( time_ago.minutes > 45 ) return 'about an hour ago';
        if ( time_ago.minutes > 2 )  return 'about ' + time_ago.minutes + ' minutes ago';
        if ( time_ago.seconds > 1 )  return 'about ' + time_ago.seconds + ' seconds ago';
        return 'just now';
    }

    function extract_relative_time(date)
    {
        var toInt = function(val) { return parseInt(val, 10); };
        var relative_to = new Date();
        var delta = toInt((relative_to.getTime() - date) / 1000);
        if (delta < 1) delta = 0;
        return {
          days:    toInt(delta / 86400),
          hours:   toInt(delta / 3600),
          minutes: toInt(delta / 60),
          seconds: toInt(delta)
        };
    }

    function prepare_template_data(item)
    {
        var o = {};

        /**
         * API v1 does keys like "two-words", we change them to keys
         * like "two_words", which is a little easier to work with in
         * code (item.two_words vs. item['two-words'])
         */
        for(i in item)
        {
            key = i.replace(new RegExp('-','g'), '_');
            o[key] = item[i];
        }

        /**
         * Now, let's add some custom vars!
         */
        o.relative_time = format_relative_time(extract_relative_time(Date.parse(o.date)));
        o.reblog_url = 'http://www.tumblr.com/reblog/'+o.id+'/'+o.reblog_key;

        switch( o.type ) {
            case 'link': {
                o.body = '<div class="link"><a href="'+o.link_url+'" target="_blank">'+o.link_text+'</a></div>'+o.link_description;
                break;
            }
            case 'photo': {
                o.body = '<div class="photo"><img src="'+o.photo_url_400+'" alt="" /></div>'+o.photo_caption;
                break;
            }
            case 'quote': {
                o.body = '<div class="quote">'+o.quote_text+'</div>'+o.quote_source;
                break;
            }
            case 'regular':
            case 'text': {
                o.body = '<div class="text">'+o.regular_title+'</div>'+o.regular_body;
                break;
            }
        }

        return o;
    }

    function load(widget)
    {
        $.getJSON('http://'+s.hostname+'/api/read/json?callback=?', s.options, function(response) {
            var list = $('<ul class="post_list">');
            var posts = $.map(response.posts, prepare_template_data);
            //posts = $.grep(posts, s.filter).sort(s.comparator).slice(0, s.count);//TODO: Implement
            list.append($.map(posts, function(o) { return '<li>' + t(s.template, o) + '</li>'; }).join('')).
              children('li:first').addClass('post_first').end().
              children('li:odd').addClass('post_even').end().
              children('li:even').addClass('post_odd');

            $(widget).empty().append(list);
            $(widget).trigger('loaded');

        });
    }

    return this.each(function(i, widget)
    {
        $(widget).unbind('tumby:load').bind('tumby:load', function(){
            load(widget);
        }).trigger('tumby:load');
    });
}