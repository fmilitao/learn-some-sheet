
all:
	tsc

clean:
	rm -rf bin/

deploy:
	#TODO does this work correctly? or is 'git pull origin gh-pages' required
	# because of our commit that removed '.gitignore' and added 'bin/' ?
	# http://lea.verou.me/2011/10/easily-keep-gh-pages-in-sync-with-master/
	# go to the gh-pages branch
	git checkout gh-pages
	# bring gh-pages up to date with master
	git rebase master
	# commit the changes
	git push origin gh-pages
	# return to the master branch
	git checkout master
