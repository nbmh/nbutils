/* global module */

'use strict';

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.initConfig({
    clean: {
      dist: ['dist/']
    },
    concat: {
      options: {
        separator: '\n\n'
      },
      src: {
        src: ['src/*.js'],
        dest: 'dist/nbUtils.js'
      }
    },
    uglify: {
      src: {
        options: {
          sourceMap: false,
          preserveComments: false,
          report: 'gzip'
        },
        files: {
          'dist/nbUtils.min.js': [
            'src/*.js',
            'src/**/*.js'
          ]
        }
      },
      dist: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: '**/*.js',
          dest: 'dist/',
          rename: function(dst, src) {
            return dst + '/' + src.replace('.js', '.min.js');
          }
        }]
      }
    },
    copy: {
      src: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: '**/*.js',
          dest: 'dist/'
        }]
      }
    }
  });
    
  grunt.registerTask('dist', function () {
    grunt.task.run(['clean:dist', 'concat:src', 'uglify:src', 'copy:src', 'uglify:dist']);
  });
};