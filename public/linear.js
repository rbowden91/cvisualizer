
function drawLinear(data) {
    // XXX for now, very rough guidelines for spacing and indentation. doesn't handle single-line ifs, loops, etc., but
    // those might not exist from pycparser?
    var output = '';
    var indentation_level = 0;
    var newline = false;

    for (var i = 0; i < data.length; i++) {
    	var token = data[i][direction].token;

	if (token === '}') {
    	    indentation_level -= 1;
	}

	if (newline) {
	    output += print_indent(indentation_level);
	    newline = false;
	}

        output += "<span style='background-color:"
        output += gradient(grad, data[i][direction].label_index_ratio) + "' data-token_num='" + i + "'>";
    	output += htmlEncode(token);
	output += "</span>";

    	if (token === '{') {
    	    output += "\n";
    	    newline = true;
    	    indentation_level += 1;
	} else if (token === '}') {
    	    output += "\n";
    	    newline = true;
	} else if (token === ';') {
    	    output += "\n";
    	    newline = true;
	} else if (alphanumeric(token)) {
	    output += " ";
	}

    }

    $('#heatmap').html(output);
}
