var gulp   = require('gulp');
var mocha  = require('gulp-mocha');
var jshint = require('gulp-jshint');

gulp.task(('default'), ['test', 'lint', 'watch'], function() {});

gulp.task('test', function() {
  return gulp.src('test/*.js')
             .pipe(mocha({reporter: 'nyan'}));
});

gulp.task('lint', function() {
  return gulp.src(['*js', 'routes/*js', 'models/*js'])
             .pipe(jshint())
             .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('watch', function() {
  return gulp.watch(['*js', 'routes/*js', 'models/*js'], ['test', 'lint']);
});
