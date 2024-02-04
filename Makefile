dev:
	npm run start

deploy:
	hugo
	cd public && git add . && git commit -m "rebuild" && git push

rebuild:
	git commit --allow-empty -m "Rebuild" && git push

clear:
	rm -f $TMPDIR/hugo_cache/website/filecache/getcsv/*
