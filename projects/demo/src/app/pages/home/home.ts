import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TrpcClient } from '../../trpc-client';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.css',
})
export class Home {
  private trpc = inject(TrpcClient);

  blogsResource = rxResource({
    stream: () => this.trpc.blog.getBlogs?.query(),
  });
}
