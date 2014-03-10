/*global module, require*/
var exec = require('child_process').exec;
module.exports = function (grunt) {
    'use strict';
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        meta: {
            dist:"dist",
            app:"app",
            banner: '/*!\n' +
                  ' * <%= pkg.name %>\n' +
                  ' * <%= pkg.description %>\n' +
                  ' * <%= pkg.url %>\n' +
                  ' * @author <%= pkg.author.name %> <%= pkg.author.url %>\n' +
                  ' * @version <%= pkg.version %>\n' +
                  ' * Copyright <%= pkg.copyright %>. <%= pkg.license %> licensed.\n' +
                  ' */\n',
            src: [
                'js/com/sesamtv/**.js'
            ],
            test: [
                'test/spec/**/tests.js',
                'test/backendTests/**/tests.js'
            ],
            grunt: [
                'Gruntfile.js'
            ]
        },
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '.tmp',
                        '<%= meta.dist %>/*',
                        '!<%= meta.dist %>/.git*'
                    ]
                }]
            },
            server: '.tmp'
        },
        'jasmine_node': {
            coverage:{
                savePath:'./build/reports/coverage',
                //for requirejs
                "hook-run-in-context":true
            },
            projectRoot: __dirname,
            specFolders:["./test/backendTests/"],
            specNameMatcher:"tests",
            extensions: 'js',
            regExpSpec:/tests\.js/,
            verbose:true,
            //matchall:true,
            //projectRoot: "./unit_testing/backendTests/",
            requirejs: false,
            forceExit: true,
            jUnit: {
                report: true,
                savePath : "./build/reports/jasmine/",
                useDotNotation: true,
                consolidate: true
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: './build/lib/jshintReporter.js',
                reporterOutput:'./build/reports/jshint.html'
            },
            src: '<%= meta.src %>'
        },
        karma: {
            unit: {
                configFile: './unit_testing/karma.conf.js'
            }
        },
        exec: {
            buildSdk: {
                command: __dirname + '/build/builder.sh -c sdk',
                stdout: true,
                stderr: true
            },
            genDocSesam:{
                command: __dirname + '/doc/gen_doc.sh',
                stdout: true,
                stderr: true
            },
            prodServer:{
                command:'node '+__dirname + '/server/index.js env=production',
                stdout: true,
                stderr: true
            },
            devServer:{
                command:'node '+__dirname + '/server/index.js env=development',
                stdout: true,
                stderr: true
            },
            sassServer:{
                command: __dirname + '/build/sass.sh watch',
                stdout: true,
                stderr: true
            }
        }
    });

    // load dependencies
    grunt.loadTasks('./build/gruntTasks');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-contrib-watch');

    //register tasks
    grunt.registerTask('build', function(configFile){
        var str = '`which node` '+__dirname+'/build/build.new.js buildModules=true buildConfig=true',
            done = this.async();
        if(configFile){
            str = str + ' configFile='+configFile+'.json';
        }
        exec(str,function(error, stdout, stderr){
            done();
            if(error){
                return grunt.log.error([error]);
            }
            grunt.log.ok([stdout]);
        });

    });
    grunt.registerTask('genDoc:sesam', ['exec:genDocSesam']);
    grunt.registerTask('server:prod', ['exec:prodServer']);
    grunt.registerTask('server:dev', ['exec:devServer','exec:sassServer']);

    // Default task -> build JSPor
    //grunt.registerTask('default', ['jshint', 'karma','genDoc:jspor','server:prod']);

};