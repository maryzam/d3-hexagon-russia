	var fixedRegions = ["KGD", "KAM", "CHU", "DA", "SMO", "PSK", "SAK", "ZAB" ];
    function isFixedRegion(region) {
        var iso = region.properties.ISO_2;
        return fixedRegions.indexOf(iso) > -1;
    }

    function isCity(region) {
        return region.properties.NAME_1.includes("City");
    }

    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    var projection = d3.geoConicEquidistant()
        .rotate([-105, 0])
        .center([-10, 65])
        .scale(width * 0.7)
        .translate([width / 2, height / 2]);
		
	var hexbin = d3.hexbin()
        .extent([[0, 0], [width, height]])
        .x((d) => d.x)
        .y((d) => d.y)
        .radius(10);

    var path = d3.geoPath().projection(projection);

    d3.json("data/russia.topo.json", function (error, russia) {
        if (error) throw error;

        var geo = topojson.feature(russia, russia.objects.regions).features;

        var regions = [];

        geo.forEach(function (item, i) {
            if (isCity(item)) { return; }
            var centroid = path.centroid(item);
            var region = {
                x: centroid[0],
                y: centroid[1]
            };
            if (isFixedRegion(item)) {
                region.fx = region.x;
                region.fy = region.y;
            }
            region.radius = Math.sqrt(path.area(item) / Math.PI);
            regions.push(region);
        });

        regions.sort(function (a, b) { return b.radius - a.radius; });
		var midRadius = d3.max(regions, function(d) { return d.radius; } ) / 2;
        
        var simulation = d3.forceSimulation(regions)
            .force("collide", d3.forceCollide().radius(function (d) { return d.radius * 0.9; }))
            .stop();

        svg
            .append("g")
			.attr("class", "background-map")
            .selectAll("path")
            .data(geo)
            .enter()
                .append("path")
                .attr("d", this.path);


		d3.timeout(function() {
			var totalTicks =  Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()));
			for (var i = 0; i < totalTicks; ++i) {
				simulation.tick();
			}
			
			var regionVis = svg.append("g")
                    .attr("class", "hexagon-map")
                    .selectAll("path")
                        .data(regions).enter()
                        .append("path")
                            .attr("d", function(d) { return hexbin.hexagon(d.radius * (d.radius < midRadius ? 1 : 1.4 )); })
                            .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });			
		});
    });