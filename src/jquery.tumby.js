/**
 * jquery.tumby.js - jQuery plugin for embedding tumblr posts
 *
 * https://github.com/bicknoyle/tumby
 * Copyright (c) 2012 Nick Boyle
 * MIT Licensed
 */
(function( $ ) {
    $.fn.tumby = function(o)
    {
        var s = $.extend({
            hostname: null,         // [string] The hostname of your blog (ex: fyeahtumby.tumblr.com)
            options: { },           // [object] key:val of options to pass the tumblr API, see http://www.tumblr.com/docs/en/api/v1#api_read for details
            template: '{body}',     // [string or function] template used to construct each post <li> - see code for available {vars}
            type_templates: {       // [string or function] template to be used for each type; these defaults are based on the markup used by the default tumblr theme
                answer:'<div class="question">{question}</div><div class="copy">{answer}</div>',
                audio: '<div class="audio">{audio_player}</div><div class="copy"></div>',
                chat:  function(item) {
                  str = '<div class="title">{conversation_title}</div><div class="chat"><div class="lines">';
                  for(i in item.conversation) { str = str+'<div class="line"><strong>'+item.conversation[i].label+'</strong>'+item.conversation[i].phrase+'</div>' };
                  return str+'</div></div>';
                },
                link:  function(item) {
                  if( item.link_text ) { return '<div class="link"><a href="{link_url}" target="_blank">{link_text}</a></div><div class="copy">{link_description}</div>' };
                  return '<div class="link"><a href="{link_url}" target="_blank">{link_url}</a></div><div class="copy">{link_description}</div>'
                },
                quote:   '<div class="quote">{quote_text}</div><div class="copy">{quote_source}</div>',
                photo:   '<div class="media"><img src="{photo_url_500}" alt="" /></div><div class="copy">{photo_caption}</div>',
                text:    '<div class="title">{regular_title}</div><div class="copy">{regular_body}</div>',
                video:   '<div class="media">{video_player_500}</div><div class="copy">{video_caption}</div>'
            }
        }, o);

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

        /**
         * Prepare the data for each posts, for use by the user in the template
         */
        function prepare_template_data(item)
        {
            var o = {};

            /**
             * Change keys from two-words to two_words
             */
            for(i in item)
            {
                key = i.replace(new RegExp('-','g'), '_');
                o[key] = item[i];
            }

            // "text" is referred to by API output as "regular"????
            if( item.type == 'regular' ) { o.type = 'text'; }
            // "chat" is referred to by API output as "conversation"????
            if( item.type == 'conversation' ) { o.type = 'chat'; }

            /**
             * Add some custom vars that may be handy for the user
             */
            o.relative_time = format_relative_time(extract_relative_time(Date.parse(o.date)));
            o.reblog_url = 'http://www.tumblr.com/reblog/'+o.id+'/'+o.reblog_key;

            /**
             * Create body, based on the type_template for that media type
             */
            if (typeof s.type_templates[o.type] === 'string')
            {
                // TODO: This code could probably use a refactor???
                o.body = t(s.type_templates[o.type], o);
            }
            else
            {
                o.body = t(s.type_templates[o.type](o), o);
            }
            return o;
        }

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

        return this.each(function(i, widget)
        {
            $(widget).unbind('tumby:load').bind('tumby:load', function(){
                load(widget);
            }).trigger('tumby:load');
        });
    }
})( jQuery );
