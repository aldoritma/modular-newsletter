// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var del = require('del');
var sass = require('gulp-sass');
var jade = require('gulp-jade');
var autoprefixer = require('gulp-autoprefixer');
var fileinclude = require('gulp-file-include');
var inline = require('gulp-mc-inliner');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var inlinesource = require('gulp-inline-source');
var util = require('gulp-util');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var nodemailer = require('nodemailer');
var fs = require('fs');
var html_strip = require('htmlstrip-native');

// Include the config
var config = require('./config.json');

var baseDirs = {
    dist:'dist/',
    src:'src/',
    output: 'output/'
};

/* routes: object that contains the paths */

var routes = {
    styles: {
        scss: baseDirs.src+'styles/*.scss',
        _scss: baseDirs.src+'styles/_includes/*.scss',
        css: baseDirs.output+'css/'
    },

    templates: {
        jade: baseDirs.src+'templates/*.jade',
        _jade: baseDirs.src+'templates/_includes/*.jade',
        html: baseDirs.output
    },

    compile: {
        html: baseDirs.dist,
        css: baseDirs.dist+'*.css',
    },


    files: {
        html: 'dist/',
        cssFiles: baseDirs.assets+'css/*.css',
        htmlFiles: baseDirs.dist+'*.html',
        styleCss: baseDirs.assets+'css/style.css'
    },
};

/* Compiling Tasks */

// Jade

gulp.task('templates', function() {
    return gulp.src([routes.templates.jade, '!' + routes.templates._jade])
        .pipe(plumber({
            errorHandler: notify.onError({
                title: "Error: Compiling Jade.",
                message:"<%= error.message %>"
            })
        }))
        .pipe(jade({
          pretty: '\t'
        }))
        .pipe(gulp.dest(routes.templates.html))
        .pipe(reload({stream:true}))
        .pipe(notify({
            title: 'Jade Compiled succesfully!',
            message: 'Jade task completed.'
        }));
});


/* Clean: Dist */
gulp.task('clean:dist', function() {
    return del(baseDirs.dist);
})

/* Clean: Dist */
gulp.task('clean:output', function() {
    return del(baseDirs.output + '*.html', baseDirs.output + '*.css' );
})

/* Clean */
gulp.task('clean', ['clean:dist', 'clean:output']);

// Compile Our Sass
gulp.task('styles', function() {
    return gulp.src(routes.styles.scss)
    .pipe(plumber({
        errorHandler: notify.onError({
            title: "Error: Compiling SCSS.",
            message:"<%= error.message %>"
        })
    }))
    .pipe(sass({errLogToConsole: true}))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(gulp.dest(routes.styles.css))
    .pipe(reload({stream:true}))
    .pipe(notify({
        title: 'SCSS Compiled and Minified succesfully!',
        message: 'scss task completed.'
    }));
});

// BrowserSync
gulp.task('browser-sync', function() {
    browserSync({
        server: {
            baseDir: "./output"
        },
        open: "external",
        logPrefix: "Gulp Email Creator"
    });
});

// Build our templates
gulp.task('build', function() {
    return gulp.src(routes.compile.html + '*.html')
        .pipe(inlinesource())
        .pipe(inline(config.APIKEY, false))
        .pipe(gulp.dest(routes.compile.html))
        .pipe(reload({stream:true}));
});


// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch([routes.styles.scss, routes.styles._scss], ['styles']);
    gulp.watch([routes.templates.jade, routes.templates._jade], ['templates']);
});

// Default Task
gulp.task('default', ['templates', 'styles', 'browser-sync', 'watch']);

// Add ability to send test emails
gulp.task('send', function () {
    return sendEmail(util.env.template, config.testing.to);
});

gulp.task('litmus', function () {
    return sendEmail(util.env.template, config.litmus);
});

function sendEmail(template, recipient) {
    try {

        var options = {
            include_script : false,
            include_style : false,
            compact_whitespace : true,
            include_attributes : { 'alt': true }
        };

        var templatePath = "./output/" + template;

        var transporter = nodemailer.createTransport({
            service: 'Mailgun',
            auth: {
                user: config.auth.mailgun.user,
                pass: config.auth.mailgun.pass
            }
        });

        var templateContent = fs.readFileSync(templatePath, encoding = "utf8");

        var mailOptions = {
            from: config.testing.from, // sender address
            to: recipient, // list of receivers
            subject: config.testing.subject + ' - ' + template, // Subject line
            html: templateContent, // html body
            text: html_strip.html_strip(templateContent, options)
        };

        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                return util.log(error);
            }else{
                return util.log('Message sent: ' + info.response);
            }
        });

    } catch (e) {
        if(e.code == 'ENOENT') {
            util.log('There was an error. Check your template name to make sure it exists in ./output');
        } else if(e instanceof TypeError) {
            util.log('There was an error. Please check your config.json to make sure everything is spelled correctly');
        } else {
            util.log(e);
        }
    }
}
