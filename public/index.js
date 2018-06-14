function htmlEncode(value) {
    return $('<div/>').text(value).html();
}

$(document).ready(function() {

    var socket = io();
    $('#submit').on('click', function(){
        msg = {
	    'code': $('#code').text(),
	    'argv': $('#argv').val()
	    'stdin': $('#stdin').val()
        }
        socket.emit('code', JSON.stringify(msg));
        return false;
    });

    socket.on('response', function(response) {
    	console.log(response);
        var model = response.model;
	$('#heatmap').html("");
    	if (response.success === false) {
	    $('#heatmap').text('Something went wrong! Maybe your code doesn\'t parse correctly?');
	} else {
            heatmap = draw(response.results[model], model);
            //displayCode(response.results.fixed_code);
	}
    });



    var start = `
#include <cs50.h> //adds GetString(), which basically renames char to string
#include <stdio.h> //allows things like printftouch
#include <stdlib.h> //adds the atoi() function
#include <string.h> //doin stuff with strings like strlen
#include <ctype.h> //adds isupper(), islower(), and isalpha()

int main(int argc, string argv[])
{
    //defining all my variables
    string keyword;
    string inputtext;
    int j = 0;
    int kwl;

    //test for an argument
    if (argc != 2)
    {
        printf("Try again, gimme one argument of only aplha characters.");
        return 1;
    }

    keyword = argv[1];
    kwl = strlen(keyword);

    //test that argument is all alpha
    for (int i = 0, n = kwl; i < n; i++)
    {
        if (!isalpha(argv[1][i]))
        {
            printf("Try again, gimme letters only.");
            return 1;
        }
        else
        {
            if (isupper(keyword[i]))
            {
                keyword[i] -= 'A';
            }
            else
            {
                keyword[i] -= 'a';
            }
        }
    }

    inputtext = GetString();

    for (int i = 0, n = strlen(inputtext); i < n; i++)
    {
        if (isalpha(inputtext[i]))
        {

            if (isupper(inputtext[i]))
            {
                inputtext[i] = ((((inputtext[i] - 'A') + (keyword[j % kwl])) % 26) +'A');
                j++;
            }
            else
            {
                inputtext[i] = ((((inputtext[i] - 'a') + (keyword[j % kwl])) % 26) + 'a');
                j++;
            }

        }
    }
    printf("%s\\n", inputtext);
}`.trim();

   $('#code').text(start);

});
