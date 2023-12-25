let usData;
let selectedStateId = "36"; // select New York State
let width = 500;
let height = 500;

const render = () => {
    let countiesData = topojson.feature(usData, usData.objects.counties).features;
    let stateData = topojson.feature(usData, usData.objects.states).features.filter((d) => d.id === selectedStateId);
    let projection = d3.geoIdentity().fitSize([width, height], stateData[0]);
    let path = d3.geoPath().projection(projection);
    // console.log(path)

    let tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')


    let svg = d3.select("#county_map");
    svg.attr('viewBox', `0 0 ${width} ${height}`)
    svg.attr('preserveAspectRatio', 'xMidYMid meet')
    svg.style('max-width', '100%').style('height', 'auto')
    const g = svg.append('g').attr("class", "container")

    g.append('g')
        .attr('class', 'states')
        .selectAll('path')
        .data(stateData)
        .join('path')
        .attr('class', 'state')
        .attr('d', path)
        .attr('id', 'state')

    g.append('clipPath')
        .attr('id', 'clip-state')
        .append('use')
        .attr('xlink:href', '#state')

    // All counties.
    g.append('g')
        .attr('class', 'counties')
        .selectAll('path')
        .data(countiesData)
        .join('path')
        .attr('clip-path', 'url(#clip-state)')
        .attr('class', 'county')
        .attr('d', path)
        // .attr('pointer-events', 'visibleStroke')
        .on('click', function (event, d) {
            // Display sidebar with county details
            d3.select("#sidebar").classed("hidden", false);
            d3.select("#county_info").text(`You clicked on: ${d.properties.name}`);
            // Set the county name in the sidebar
            d3.select("#county_name").text(d.properties.name);

            //const countyData = getCountyData(d.properties.name);    // get county data

            // Get the mean traffic county data for the selected data and plot it.
            getCountyData(d.properties.name);
            //drawLinePlotMeanTrafficState(countyData);   // render line plot
            drawStackedBarChart(d.properties.name);
            
        })
        .on('mouseover', function (event, d) {
            d3.select(this).transition().duration(200)
                .style("fill", "orange");
            tooltip.text(d.properties.name).style('display', '');
        })
        .on('mousemove', function (event) {
            tooltip
                .style('top', (event.pageY - 30) + 'px')
                .style('left', (event.pageX + 30) + 'px');
        })
        .on('mouseout', function () {
            d3.select(this).transition().duration(200)
                .style("fill", "white");
            tooltip.style('display', 'none');
        })
    // do some styling
    g.selectAll("path").attr("fill", "white");
    g.selectAll("path").attr('stroke-width', '1')
        .attr("stroke", "black");
};


// Function to close the sidebar
function closeSidebar() {
    d3.select("#sidebar").classed("hidden", true);
};


// parse json
d3.json('https://d3js.org/us-10m.v2.json').then((data) => {
    usData = data;
    render();
    // create the select element

    d3.tsv("county_data.tsv").then((county_data) => {
        /*
        let county_select = d3.select("#county_select")
        county_select.on('change', function () {
            //selectedStateId = this.value;
            selectedStateId = event.target.value;
            d3.select('.container').remove();
            render();
        })
        let option = county_select.selectAll('option').data(county_data)
        option = option.enter().append('option').merge(option)
            .attr('value', d => d.id)
            .text(d => d.name) 
            */

        // Close button event listener
        d3.select("#close_sidebar").on("click", closeSidebar);

        // ESC key event listener
        d3.select("body").on("keydown", function (event) {
            if (event.keyCode === 27) { // 27 is the keycode for ESC
                closeSidebar();
            }
        });
    }).catch(error => {
        console.error("Error loading the map data: ", error);
    });
})

// parse csv data. cleaned using python file beforehand
d3.csv("clean_mean_traffic.csv", d3.autoType).then(function (data) {
    console.log(data);
});


// helper function to plot line plot for the mean county traffic data
function drawLinePlotMeanTrafficState(countyData) {
    // Clear existing content
    d3.select("#meanCountyTrafficState").selectAll("*").remove();

    // console.log("ready to plot this data:", countyData);

    // Parse the year as a date
    countyData.forEach(d => {
        d.Year = new Date(d.Year, 0, 1); // Convert year to a Date object (January 1st of that year)
    });

    // Set the dimensions and margins of the graph
    const margin = { top: 10, right: 30, bottom: 30, left: 60 },
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // Set up the SVG
    const svg = d3.select("#meanCountyTrafficState")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Set the ranges
    const x = d3.scaleTime()
        .domain(d3.extent(countyData, function (d) { return d.Year; }))
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    const y = d3.scaleLinear()
        .domain([0, d3.max(countyData, function (d) { return d.Count })])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add the line
    svg.append("path")
        .datum(countyData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function (d) { return x(d.Year) })
            .y(function (d) { return y(d.Count) })
        )


    // Set up your scales, axes, and line generator
    // This depends on the format of your data and your specific needs
    // ...

    // Draw the line plot inside the #line_chart SVG
    // ...
}

// Helper function to get the county mean traffic data
function getCountyData(countyName) {
    // parse csv data. cleaned using python file beforehand
    d3.csv("clean_mean_traffic.csv", d3.autoType).then(function (data) {

        const filteredData = data.filter(row => row.County === countyName);

        //console.log("Filtered traffic data for " + countyName, filteredData);
        //console.log("mean state traffic",data);

        // Plot the line plot
        drawLinePlotMeanTrafficState(filteredData);

    });

}


function drawStackedBarChart(countyName){
    d3.csv("avg_traffic_county_roadstype.csv",d3.autoType).then(function(data){
        const filteredData = data.filter(row=>row.County===countyName);

        d3.select("#countyStackedBarChart").selectAll("*").remove();

        // Parse the year as a date
        filteredData.forEach(d => {
            d.Year = new Date(d.Year, 0, 1); // Convert year to a Date object (January 1st of that year)
        });

        // Set the dimensions and margins of the graph
        const margin = { top: 10, right: 30, bottom: 30, left: 60 },
            width = 460 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        // Set up the SVG
        const svg = d3.select("#countyStackedBarChart")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // Set the ranges
        const x = d3.scaleTime()
            .domain(d3.extent(filteredData, function (d) { return d.Year; }))
            .range([0, width]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        const y = d3.scaleLinear()
            .domain([0, 2*d3.max(filteredData, function (d) { return d.Count })])
            .range([height, 0]);
        svg.append("g")
            .call(d3.axisLeft(y));

        const color = d3.scaleOrdinal()
            .domain([0,1,2])
            .range(['#665191','#a05195','#d45087'])

        const stackedData = d3.stack()
            .keys(d3.union(filteredData.map(d=>d.type)))
            .value(([,group],key)=>group.get(key).Count)
            (d3.index(filteredData,d=>d.Year, d=>d.type))

        svg.append("g").selectAll("g")
            .data(stackedData)
            .join("g")
            .attr("fill", d=>color(d.key))
            .selectAll("rect")
            .data(d=>{
            return d
            })
            .join("rect")
            .attr("x", d=>x(d.data[0]))
            .attr("y", d=>{
                return y(d[1])
            })
            // .attr("height", d=>100)
            .attr("height", d=>y(d[0])-y(d[1]))
            .attr("width", 5)
    })
}
