import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { TrpcClient } from '../../trpc-client';

@Component({
  selector: 'app-blog',
  imports: [],
  templateUrl: './blog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './blog.css',
})
export class Blog {
  private trpc = inject(TrpcClient);
  private route = inject(ActivatedRoute);

  private blogId = toSignal(this.route.params.pipe(map((params) => Number(params['blogId']))));

  postResouce = rxResource({
    stream: ({ params }) =>
      this.trpc.post.getPosts.query({
        blogId: params.blogId,
      }),
    params: () => ({ blogId: this.blogId() }),
  });
}
