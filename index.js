let usData;
let selectedStateId = "36"; // select New York State
let width = 500;
let height = 500;

// Correlation matrix color scale
const corrMatrixColorScale = d3.scaleLinear()
    .domain([0, 1])                     // Input values
    //.range(["#44ffb0", "#07301e"])    // Output colors
    .range(["#003f5c", "#ffa600"])      // Changed the colors to be the specified colors
    .clamp(true);                       // Limit output to the defined range


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
            if(d.properties.name === "St. Lawrence") {
                drawTable(d.properties.name);
                getCountyData("Saint Lawrence");
                drawStackedBarChart("Saint Lawrence");
                drawThemeRiverChart("Saint Lawrence");
            }
            else{
                drawTable(d.properties.name);
                getCountyData(d.properties.name);
                drawStackedBarChart(d.properties.name);
                drawThemeRiverChart(d.properties.name);
            }

            
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
        width = 480 - margin.left - margin.right,
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
    // 0： 'State Road'
    // 1： 'County Road'
    // 2： 'Other Road'
    const stateRoad  = countyData.filter(row => row.type === 0);
    const countyRoad = countyData.filter(row => row.type === 1);
    const otherRoad  = countyData.filter(row => row.type === 2);

    svg.append("path")
    .datum(stateRoad)
    .attr("fill", "none")
    .attr("stroke", "#665191")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
        .x(function (d) { return x(d.Year) })
        .y(function (d) { return y(d.Count) })
    )
    svg.append("path")
    .datum(countyRoad)
    .attr("fill", "none")
    .attr("stroke", "#a05195")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
        .x(function (d) { return x(d.Year) })
        .y(function (d) { return y(d.Count) })
    )
    svg.append("path")
    .datum(otherRoad)
    .attr("fill", "none")
    .attr("stroke", "#d45087")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
        .x(function (d) { return x(d.Year) })
        .y(function (d) { return y(d.Count) })
    )

    const legend = d3.select("#meanCountyTrafficState_legend")        
    legend.append("circle").attr("cx",200).attr("cy",130).attr("r", 6).style("fill", "#665191")
    legend.append("circle").attr("cx",200).attr("cy",160).attr("r", 6).style("fill", "#a05195")
    legend.append("circle").attr("cx",200).attr("cy",190).attr("r", 6).style("fill", "#d45087")
    legend.append("text").attr("x", 220).attr("y", 130).text("State Road").style("font-size", "15px").attr("alignment-baseline","middle")
    legend.append("text").attr("x", 220).attr("y", 160).text("County Road").style("font-size", "15px").attr("alignment-baseline","middle")
    legend.append("text").attr("x", 220).attr("y", 190).text("other").style("font-size", "15px").attr("alignment-baseline","middle")
    

    // Set up your scales, axes, and line generator
    // This depends on the format of your data and your specific needs
    // ...

    // Draw the line plot inside the #line_chart SVG
    // ...
}

// Helper function to get the county mean traffic data
function getCountyData(countyName) {
    // parse csv data. cleaned using python file beforehand
    d3.csv("avg_traffic_county_roadstype.csv", d3.autoType).then(function (data) {

        const filteredData = data.filter(row => row.County === countyName);

        //console.log("Filtered traffic data for " + countyName, filteredData);
        //console.log("mean state traffic",data);

        // Plot the line plot
        drawLinePlotMeanTrafficState(filteredData);

        // Plot the correlation matrix
        drawTrafficPollutionCorrelationMatrix();

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
            width = 480 - margin.left - margin.right,
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

        const legend = d3.select("#countyStackedBarChart_legend")        
        legend.append("circle").attr("cx",200).attr("cy",130).attr("r", 6).style("fill", "#665191")
        legend.append("circle").attr("cx",200).attr("cy",160).attr("r", 6).style("fill", "#a05195")
        legend.append("circle").attr("cx",200).attr("cy",190).attr("r", 6).style("fill", "#d45087")
        legend.append("text").attr("x", 220).attr("y", 130).text("State Road").style("font-size", "15px").attr("alignment-baseline","middle")
        legend.append("text").attr("x", 220).attr("y", 160).text("County Road").style("font-size", "15px").attr("alignment-baseline","middle")
        legend.append("text").attr("x", 220).attr("y", 190).text("other").style("font-size", "15px").attr("alignment-baseline","middle")

    })
}

function drawThemeRiverChart(countyName) {

    d3.csv("avg_traffic_county_roadstype.csv",d3.autoType).then(function(imputdata){

        const data = imputdata.filter(row => row.County === countyName);

        data.forEach(d => {
            if(d.type === 0) {
                d.category = "State Road";
            }
            else if(d.type === 1) {
                d.category = "County Road";
            }
            else if(d.type === 2) {
                d.category = "Other Road";
            }
            d.value = d.Count;
        });
        // console.log("drawThemeRiverChart:",data);

        categories = ["State Road", "County Road", "Other Road"]
        d3.select("#themeRiverChart").selectAll("*").remove();

        const margin = { top: 10, right: 30, bottom: 30, left: 60 },
            width = 480 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        const svg = d3.select("#themeRiverChart")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        data.forEach(d => {
            d.Year = d3.timeParse("%Y")(d.Year); // Adjust the format as per your data
        });

        const groupedData = Array.from(d3.group(data, d => d.Year), ([key, value]) => ({ date: key, values: value }));


        const stack = d3.stack()
                    .keys(categories)
                    .value((d, key) => d.values.find(v => v.category === key)?.value || 0);
        const stackedData = stack(groupedData);

        // console.log("stackedData:",stackedData);

        const xScale = d3.scaleTime()
                        .domain(d3.extent(data, d => d.Year))
                        .range([0, width]);
        
        const yScale = d3.scaleLinear()
                        .domain([d3.min(stackedData, layer => d3.min(layer, d => d[0])), 
                                d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
                        .range([height, 0]);

        const colorScale = d3.scaleOrdinal()
            .domain(categories)
            .range(['#665191', '#a05195', '#d45087']);

        const area = d3.area()
                    .x(d => xScale(d.data.date))
                    .y0(d => yScale(d[0]))
                    .y1(d => yScale(d[1]));

        svg.selectAll(".layer")
        .data(stackedData)
        .enter().append("path")
            .attr("class", "layer")
            .attr("d", area)
            .style("fill", (d, i) => colorScale(i));

        // 9. Add Axes
        svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

        svg.append("g")
            .call(d3.axisLeft(yScale));
        
        const legend = d3.select("#themeRiverChart_legend")        
        legend.append("circle").attr("cx",200).attr("cy",130).attr("r", 6).style("fill", "#665191")
        legend.append("circle").attr("cx",200).attr("cy",160).attr("r", 6).style("fill", "#a05195")
        legend.append("circle").attr("cx",200).attr("cy",190).attr("r", 6).style("fill", "#d45087")
        legend.append("text").attr("x", 220).attr("y", 130).text("State Road").style("font-size", "15px").attr("alignment-baseline","middle")
        legend.append("text").attr("x", 220).attr("y", 160).text("County Road").style("font-size", "15px").attr("alignment-baseline","middle")
        legend.append("text").attr("x", 220).attr("y", 190).text("other").style("font-size", "15px").attr("alignment-baseline","middle")
    })
}
// Helper function to do Pearson calculations for the correlation matrix
// Helper function to calculate Pearson correlations
function pearsonCorrelation(arrX, arrY) {
    // Check that the arrays are of the same size
    if (arrX.length != arrY.length) {
        throw new Error("Arrays does not have same length")
    }

    const meanX = arrX.reduce((a, b) => a + b, 0) / arrX.length;
    const meanY = arrY.reduce((a, b) => a + b, 0) / arrY.length;

    const devX = arrX.map(x => x - meanX);
    const devY = arrY.map(y => y - meanY);

    const devProduct = devX.map((x, i) => x * devY[i]);

    const sumDevProduct = devProduct.reduce((a, b) => a + b, 0);
    const sumSquaresX = devX.map(x => x ** 2).reduce((a, b) => a + b, 0);
    const sumSquaresY = devY.map(y => y ** 2).reduce((a, b) => a + b, 0);

    const r = sumDevProduct / Math.sqrt(sumSquaresX * sumSquaresY);

    return r;
};

// Helper function to calculate the correlation matrix
function calculateCorrelationMatrix(data) {
    let correlationMatrix = [];

    // Step 1. Create an array of data
    let yearArr = data.map(d => d.Year);
    let countArr = data.map(d => d.Count);
    let pm25Arr = data.map(d => d.pm25);

    //let variables = [yearArr, countArr, pm25Arr];
    let variables = [countArr, pm25Arr];


    // Step 2. Calculate correlation matrix
    for (let i = 0; i < variables.length; i++) {
        correlationMatrix[i] = [];

        for (let j = 0; j < variables.length; j++) {
            correlationMatrix[i][j] = pearsonCorrelation(variables[i], variables[j]);
        };
    };

    return correlationMatrix;
};

// Helper function that plots the correlation matrix
function renderCorrelationMatrix(matrix) {
    // remove previous plot before plotting new one
    d3.select("#pollutionTrafficcorrelationMatrix").selectAll("*").remove();

    //let variableNames = ['Year', 'Count', 'pm25'];
    let variableNames = ['Count', 'pm25'];
    //let variableNames = [yearArr, countArr, pm25Arr]

    // Set the dimensions and margins of the graph
    const matrixMargin = { top: 60, right: 30, bottom: 30, left: 60 },
        matrixWidth = 460 - matrixMargin.left - matrixMargin.right,
        matrixHeight = 400 - matrixMargin.top - matrixMargin.bottom;

    // Set up the SVG
    const matrixSvg = d3.select("#pollutionTrafficcorrelationMatrix")
        .attr("width", matrixWidth + matrixMargin.left + matrixMargin.right)
        .attr("height", matrixHeight + matrixMargin.top + matrixMargin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + matrixMargin.left + "," + matrixMargin.top + ")");

    // Add title to the correlation matrix
    matrixSvg.append("text")
        .attr("x", matrixWidth / 2)
        .attr("y", 0 - (matrixMargin.top / 2))
        .attr("text-anchor", "middle")
        //.style("class", "text-title")
        .classed("text-title", true)
        .text(`Correlation Matrix for State Yearly Average Traffic and PM25-Pollution`);

    // Create the x and y scale
    const xScale = d3.scaleBand().domain(variableNames).range([0, matrixWidth]);
    const yScale = d3.scaleBand().domain(variableNames).range([0, matrixHeight]);

    // add top-axis and labels
    matrixSvg.append('g')
        .call(d3.axisTop(xScale))
        .selectAll("text")
        .classed("axis-label", true);
    // add left-axis and labels
    matrixSvg.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .classed("axis-label", true);

    // Render the heatmap
    const rect = matrixSvg.selectAll("rect")
        .data(matrix.flat())
        .join("rect")
        .attr("x", (d, i) => xScale(variableNames[i % variableNames.length]))
        .attr("y", (d, i) => yScale(variableNames[Math.floor(i / variableNames.length)]))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => corrMatrixColorScale(d))
        .append("title") // Adding tooltips
        .text(d => d);

    // Add the correlation number to each rectangle
    matrixSvg.selectAll("text.correlation")
        .data(matrix.flat())
        .join("text") // Appends text element for each data point
        //.attr("class", "text-label")
        .classed("text-label", true)
        .attr("x", (d, i) => xScale(variableNames[i % variableNames.length]) + xScale.bandwidth() / 2)
        .attr("y", (d, i) => yScale(variableNames[Math.floor(i / variableNames.length)]) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em") // to vertically center
        .attr("text-anchor", "middle")
        .text(d => d.toFixed(2));  // round to two decimal places

};

function drawTrafficPollutionCorrelationMatrix() {
    console.log("Ready to plot correlation matrix")
    // parse csv data. cleaned using python file beforehand
    d3.csv("combined_data.csv", d3.autoType).then(function (data) {
        // Make the correlation matrix
        let matrix = calculateCorrelationMatrix(data);
        console.log("correlation matrix", matrix);

        // Plot the correlation matrix
        renderCorrelationMatrix(matrix);

    });
}

function drawTable(countyName) {

    d3.csv("List-of-counties-in-NewYork.csv",d3.autoType).then(function(imputdata){
        const data = imputdata.filter(row => row.County === countyName + " County");

        console.log("drawTable:",data);
        // Select the HTML element based on the provided ID

        const table = d3.select("#CountyInfo");
        table.selectAll("*").remove();  // Clear any existing content

        table.append('table');
        const thead = table.append('thead');
        const tbody = table.append('tbody');

        // Extract the column headers
        const columns = Object.keys(data[0]);

        // Append the header row
        thead.append('tr')
            .selectAll('th')
            .data(columns)
            .enter()
            .append('th')
            .text(column => column);

        // Create a row for each object in the data
        const rows = tbody.selectAll('tr')
            .data(data)
            .enter()
            .append('tr');

        // Create a cell in each row for each column
        rows.selectAll('td')
            .data(row => columns.map(column => ({ column: column, value: row[column] })))
            .enter()
            .append('td')
            .text(d => d.value);

         // Apply styles to the table, th, and td elements
        table.style('border-collapse', 'collapse')
        .style('border', '1px solid black');

        thead.selectAll('th')
            .style('border', '1px solid black')
            .style('padding', '5px');

        tbody.selectAll('td')
            .style('border', '1px solid black')
            .style('padding', '5px');

    })
}